import { createSession, parseDeviceInfo } from '../sessions/session.service.js'
import { verifyPassword } from '../../infrastructure/crypto/password.js'
import { findUserById, updateLastLogin } from '../users/user.service.js'
import { RATE_LIMITS, getCookieNames } from '../../config/constants.js'
import { mfaVerifySchema, mfaDisableSchema } from './mfa.schemas.js'
import { createRefreshToken } from '../tokens/refresh.service.js'
import { authenticate } from '../../middleware/authenticate.js'
import { getRedis } from '../../infrastructure/redis/client.js'
import { RedisKeys } from '../../infrastructure/redis/keys.js'
import { rateLimiter } from '../../middleware/rate-limiter.js'
import { validateBody } from '../../middleware/validate.js'
import { getUserProfile } from '../users/user.service.js'
import type { AppEnv } from '../../shared/types.js'
import { auditLog } from '../audit/audit.service.js'
import { setCookie, getCookie } from 'hono/cookie'
import { getEnv } from '../../config/env.js'
import { Hono } from 'hono'

import {
      signAccessToken,
      verifyAccessToken,
      verifyMfaChallengeToken,
} from '../tokens/token.service.js'

import {
      ForbiddenError,
      AuthenticationError,
      InvalidCredentialsError,
} from '../../shared/errors.js'

import {
      disableMfa,
      verifyMfaCode,
      initiateMfaSetup,
      verifyRecoveryCode,
      verifyAndEnableMfa,
} from './mfa.service.js'

const mfaRoutes = new Hono<AppEnv>()

// POST /mfa/setup — initiate MFA setup
mfaRoutes.post(
      '/setup',
      rateLimiter(RATE_LIMITS.mfaSetup, 'mfa-setup'),
      authenticate,
      async (c) => {
            const userId = c.get('userId')
            const result = await initiateMfaSetup(userId)

            auditLog({
                  actorId: userId,
                  action: 'auth.mfa.setup_initiated',
                  resourceType: 'user',
                  resourceId: userId,
                  ipAddress: c.get('clientIp'),
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            return c.json({
                  success: true,
                  data: {
                        qrCodeDataUrl: result.qrCodeDataUrl,
                        secret: result.secret,
                        recoveryCodes: result.recoveryCodes,
                  },
            })
      },
)

// POST /mfa/verify — verify TOTP (for setup confirmation OR login MFA challenge)
mfaRoutes.post(
      '/verify',
      rateLimiter(RATE_LIMITS.mfaAttempt, 'mfa-verify'),
      validateBody(mfaVerifySchema),
      async (c) => {
            const { code, mfaChallengeToken } = c.req.valid('json')
            const env = getEnv()

            // If mfaChallengeToken is present, this is a login MFA challenge
            if (mfaChallengeToken) {
                  const challengePayload =
                        await verifyMfaChallengeToken(mfaChallengeToken)
                  const userId = challengePayload.sub
                  const jti = challengePayload.jti

                  // Single-use enforcement: check and decrement attempt counter
                  const redis = getRedis()
                  const challengeKey = RedisKeys.mfaChallengeAttempts(jti)
                  const remaining = await redis.decr(challengeKey)

                  if (remaining < 0) {
                        await redis.del(challengeKey)
                        throw new AuthenticationError(
                              'MFA challenge expired or attempts exhausted',
                        )
                  }

                  // Try TOTP code first, then recovery code
                  let valid = await verifyMfaCode(userId, code)
                  let usedRecovery = false
                  if (!valid) {
                        valid = await verifyRecoveryCode(userId, code)
                        usedRecovery = true
                  }

                  if (!valid) {
                        auditLog({
                              actorId: userId,
                              action: 'auth.mfa.failed',
                              resourceType: 'user',
                              resourceId: userId,
                              severity: 'warn',
                              ipAddress: c.get('clientIp'),
                              requestId: c.get('requestId'),
                              correlationId: c.get('correlationId'),
                        })
                        throw new InvalidCredentialsError()
                  }

                  // MFA passed — complete login
                  const user = await findUserById(userId)
                  if (!user) throw new InvalidCredentialsError()

                  // MFA passed — consume the challenge token
                  await redis.del(challengeKey)

                  const profile = await getUserProfile(userId)
                  const deviceInfo = parseDeviceInfo(
                        c.req.header('user-agent') ?? null,
                  )
                  const session = await createSession({
                        userId,
                        ipAddress: c.get('clientIp'),
                        userAgent: c.req.header('user-agent') ?? null,
                        deviceInfo,
                        mfaVerified: true,
                  })

                  const accessToken = await signAccessToken({
                        userId,
                        sessionId: session.id,
                        role: profile.role,
                        mfaVerified: true,
                  })

                  const { token: refreshToken } = await createRefreshToken(
                        session.id,
                  )
                  await updateLastLogin(userId, c.get('clientIp'))

                  // Set cookies
                  const cookieNames = getCookieNames()
                  setCookie(c, cookieNames.access, accessToken, {
                        httpOnly: true,
                        secure: env.COOKIE_SECURE,
                        sameSite: 'Strict',
                        path: '/',
                        maxAge: env.JWT_ACCESS_TOKEN_TTL,
                  })

                  setCookie(c, cookieNames.refresh, refreshToken, {
                        httpOnly: true,
                        secure: env.COOKIE_SECURE,
                        sameSite: 'Strict',
                        path: '/auth/refresh',
                        maxAge: env.JWT_REFRESH_TOKEN_TTL,
                  })

                  auditLog({
                        actorId: userId,
                        action: usedRecovery
                              ? 'auth.mfa.recovery_used'
                              : 'auth.mfa.verified',
                        resourceType: 'user',
                        resourceId: userId,
                        severity: usedRecovery ? 'warn' : 'info',
                        ipAddress: c.get('clientIp'),
                        requestId: c.get('requestId'),
                        correlationId: c.get('correlationId'),
                  })

                  return c.json({
                        success: true,
                        data: { message: 'Login successful' },
                  })
            }

            // MFA setup confirmation — requires authentication via access token cookie
            const cookieNames = getCookieNames()
            const accessCookie = getCookie(c, cookieNames.access)
            if (!accessCookie) {
                  throw new AuthenticationError()
            }

            const tokenPayload = await verifyAccessToken(accessCookie)
            const userId = tokenPayload.sub
            if (!userId || typeof userId !== 'string') {
                  throw new AuthenticationError()
            }

            const enabled = await verifyAndEnableMfa(userId, code)
            if (!enabled) {
                  throw new InvalidCredentialsError()
            }

            auditLog({
                  actorId: userId,
                  action: 'auth.mfa.enabled',
                  resourceType: 'user',
                  resourceId: userId,
                  ipAddress: c.get('clientIp'),
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            return c.json({
                  success: true,
                  data: { message: 'MFA enabled successfully' },
            })
      },
)

// POST /mfa/disable — disable MFA (requires password + TOTP confirmation)
mfaRoutes.post(
      '/disable',
      rateLimiter(RATE_LIMITS.mfaAttempt, 'mfa-disable'),
      authenticate,
      validateBody(mfaDisableSchema),
      async (c) => {
            const userId = c.get('userId')
            const { password, code } = c.req.valid('json')

            // Verify password
            const user = await findUserById(userId)
            if (!user) throw new InvalidCredentialsError()

            const passwordValid = await verifyPassword(
                  user.passwordHash,
                  password,
            )
            if (!passwordValid) throw new InvalidCredentialsError()

            // Verify TOTP
            const codeValid = await verifyMfaCode(userId, code)
            if (!codeValid) throw new InvalidCredentialsError()

            await disableMfa(userId)

            auditLog({
                  actorId: userId,
                  action: 'auth.mfa.disabled',
                  resourceType: 'user',
                  resourceId: userId,
                  ipAddress: c.get('clientIp'),
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            return c.json({ success: true, data: { message: 'MFA disabled' } })
      },
)

export { mfaRoutes }
