import { Hono } from 'hono'
import type { Context } from 'hono'
import type { AppEnv } from '../../shared/types.js'
import { validateBody } from '../../middleware/validate.js'
import { rateLimiter } from '../../middleware/rate-limiter.js'
import { authenticate } from '../../middleware/authenticate.js'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { RATE_LIMITS, getCookieNames } from '../../config/constants.js'
import { getEnv } from '../../config/env.js'
import {
      registerSchema,
      loginSchema,
      verifyEmailSchema,
      requestPasswordResetSchema,
      resetPasswordSchema,
} from './auth.schemas.js'
import { AUTH_MESSAGES } from './auth.errors.js'
import {
      register,
      login,
      logout,
      refresh,
      verifyEmail,
      requestPasswordReset,
      resetPassword,
} from './auth.service.js'
import { getUserProfile } from '../users/user.service.js'
import { InvalidTokenError } from '../../shared/errors.js'

const authRoutes = new Hono<AppEnv>()

// ─── Helper: Set auth cookies ───────────────────────────────────────
function setAuthCookies(
      c: Context<AppEnv>,
      accessToken: string,
      refreshToken: string,
) {
      const env = getEnv()
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
}

function clearAuthCookies(c: Context<AppEnv>) {
      const cookieNames = getCookieNames()
      deleteCookie(c, cookieNames.access, { path: '/' })
      deleteCookie(c, cookieNames.refresh, { path: '/auth/refresh' })
}

// ─── POST /register ─────────────────────────────────────────────
authRoutes.post(
      '/register',
      rateLimiter(RATE_LIMITS.register, 'register'),
      validateBody(registerSchema),
      async (c) => {
            const body = c.req.valid('json')
            const result = await register({
                  email: body.email,
                  password: body.password,
                  displayName: body.displayName,
                  ipAddress: c.get('clientIp'),
                  userAgent: c.req.header('user-agent') ?? null,
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            const env = getEnv()
            return c.json(
                  {
                        success: true,
                        data: {
                              message: AUTH_MESSAGES.REGISTER_SUCCESS,
                              userId: result.userId,
                              ...(env.NODE_ENV !== 'production'
                                    ? {
                                            emailVerificationToken:
                                                  result.emailVerificationToken,
                                      }
                                    : {}),
                        },
                  },
                  201,
            )
      },
)

// ─── POST /login ────────────────────────────────────────────────
authRoutes.post(
      '/login',
      rateLimiter(RATE_LIMITS.login, 'login'),
      validateBody(loginSchema),
      async (c) => {
            const body = c.req.valid('json')
            const result = await login({
                  email: body.email,
                  password: body.password,
                  ipAddress: c.get('clientIp'),
                  userAgent: c.req.header('user-agent') ?? null,
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            if (result.mfaRequired) {
                  return c.json({
                        success: true,
                        data: {
                              mfaRequired: true,
                              mfaChallengeToken: result.mfaChallengeToken,
                        },
                  })
            }

            setAuthCookies(c, result.accessToken, result.refreshToken)

            return c.json({
                  success: true,
                  data: { message: 'Login successful' },
            })
      },
)

// ─── POST /logout ───────────────────────────────────────────────
authRoutes.post('/logout', authenticate, async (c) => {
      await logout({
            sessionId: c.get('sessionId'),
            userId: c.get('userId'),
            ipAddress: c.get('clientIp'),
            requestId: c.get('requestId'),
            correlationId: c.get('correlationId'),
      })

      clearAuthCookies(c)

      return c.json({
            success: true,
            data: { message: AUTH_MESSAGES.LOGOUT_SUCCESS },
      })
})

// ─── POST /refresh ──────────────────────────────────────────────
authRoutes.post(
      '/refresh',
      rateLimiter(RATE_LIMITS.refresh, 'refresh'),
      async (c) => {
            const cookieNames = getCookieNames()
            const rawRefreshToken = getCookie(c, cookieNames.refresh)
            if (!rawRefreshToken) {
                  throw new InvalidTokenError()
            }

            const result = await refresh({
                  rawRefreshToken,
                  ipAddress: c.get('clientIp'),
                  userAgent: c.req.header('user-agent') ?? null,
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            setAuthCookies(c, result.accessToken, result.refreshToken)

            return c.json({
                  success: true,
                  data: { message: 'Token refreshed' },
            })
      },
)

// ─── POST /verify-email ─────────────────────────────────────────
authRoutes.post(
      '/verify-email',
      rateLimiter(RATE_LIMITS.emailVerification, 'verify-email'),
      validateBody(verifyEmailSchema),
      async (c) => {
            const { token } = c.req.valid('json')

            await verifyEmail({
                  token,
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            return c.json({
                  success: true,
                  data: { message: AUTH_MESSAGES.EMAIL_VERIFICATION_SUCCESS },
            })
      },
)

// ─── POST /request-password-reset ───────────────────────────────
authRoutes.post(
      '/request-password-reset',
      rateLimiter(RATE_LIMITS.passwordReset, 'pwd-reset'),
      validateBody(requestPasswordResetSchema),
      async (c) => {
            const { email } = c.req.valid('json')

            const result = await requestPasswordReset({
                  email,
                  ipAddress: c.get('clientIp'),
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            const env = getEnv()
            return c.json({
                  success: true,
                  data: {
                        message: AUTH_MESSAGES.PASSWORD_RESET_REQUESTED,
                        ...(env.NODE_ENV !== 'production' && result.token
                              ? { resetToken: result.token }
                              : {}),
                  },
            })
      },
)

// ─── POST /reset-password ───────────────────────────────────────
authRoutes.post(
      '/reset-password',
      rateLimiter(RATE_LIMITS.passwordReset, 'pwd-reset'),
      validateBody(resetPasswordSchema),
      async (c) => {
            const { token, password } = c.req.valid('json')

            await resetPassword({
                  token,
                  newPassword: password,
                  ipAddress: c.get('clientIp'),
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            clearAuthCookies(c)

            return c.json({
                  success: true,
                  data: { message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS },
            })
      },
)

// ─── GET /me ────────────────────────────────────────────────────
authRoutes.get(
      '/me',
      rateLimiter(RATE_LIMITS.general, 'me'),
      authenticate,
      async (c) => {
            const userId = c.get('userId')
            const profile = await getUserProfile(userId)
            return c.json({ success: true, data: profile })
      },
)

export { authRoutes }
