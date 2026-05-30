import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AppEnv } from '../../shared/types.js';
import { authenticate } from '../../middleware/authenticate.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { validateBody } from '../../middleware/validate.js';
import { RATE_LIMITS, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../config/constants.js';
import { getEnv } from '../../config/env.js';
import { mfaVerifySchema, mfaDisableSchema } from './mfa.schemas.js';
import {
  initiateMfaSetup,
  verifyAndEnableMfa,
  verifyMfaCode,
  verifyRecoveryCode,
  disableMfa,
} from './mfa.service.js';
import { verifyMfaChallengeToken } from '../tokens/token.service.js';
import { signAccessToken } from '../tokens/token.service.js';
import { createRefreshToken } from '../tokens/refresh.service.js';
import { createSession, parseDeviceInfo } from '../sessions/session.service.js';
import { findUserById, updateLastLogin } from '../users/user.service.js';
import { verifyPassword } from '../../infrastructure/crypto/password.js';
import { auditLog } from '../audit/audit.service.js';
import { InvalidCredentialsError, ForbiddenError } from '../../shared/errors.js';
import { getUserProfile } from '../users/user.service.js';

const mfaRoutes = new Hono<AppEnv>();

// POST /mfa/setup — initiate MFA setup
mfaRoutes.post(
  '/setup',
  rateLimiter(RATE_LIMITS.mfaSetup, 'mfa-setup'),
  authenticate,
  async (c) => {
    const userId = c.get('userId');
    const result = await initiateMfaSetup(userId);

    auditLog({
      actorId: userId,
      action: 'auth.mfa.setup_initiated',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: c.get('clientIp'),
      requestId: c.get('requestId'),
      correlationId: c.get('correlationId'),
    });

    return c.json({
      success: true,
      data: {
        qrCodeDataUrl: result.qrCodeDataUrl,
        secret: result.secret,
        recoveryCodes: result.recoveryCodes,
      },
    });
  },
);

// POST /mfa/verify — verify TOTP (for setup confirmation OR login MFA challenge)
mfaRoutes.post(
  '/verify',
  rateLimiter(RATE_LIMITS.mfaAttempt, 'mfa-verify'),
  validateBody(mfaVerifySchema),
  async (c) => {
    const { code, mfaChallengeToken } = c.req.valid('json');
    const env = getEnv();

    // If mfaChallengeToken is present, this is a login MFA challenge
    if (mfaChallengeToken) {
      const challengePayload = await verifyMfaChallengeToken(mfaChallengeToken);
      const userId = challengePayload.sub;

      // Try TOTP code first, then recovery code
      let valid = await verifyMfaCode(userId, code);
      let usedRecovery = false;
      if (!valid) {
        valid = await verifyRecoveryCode(userId, code);
        usedRecovery = true;
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
        });
        throw new InvalidCredentialsError();
      }

      // MFA passed — complete login
      const user = await findUserById(userId);
      if (!user) throw new InvalidCredentialsError();

      const profile = await getUserProfile(userId);
      const deviceInfo = parseDeviceInfo(c.req.header('user-agent') ?? null);
      const session = await createSession({
        userId,
        ipAddress: c.get('clientIp'),
        userAgent: c.req.header('user-agent') ?? null,
        deviceInfo,
      });

      const accessToken = await signAccessToken({
        userId,
        sessionId: session.id,
        role: profile.role,
        mfaVerified: true,
      });

      const { token: refreshToken } = await createRefreshToken(session.id);
      await updateLastLogin(userId, c.get('clientIp'));

      // Set cookies
      setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'Strict',
        path: '/',
        maxAge: env.JWT_ACCESS_TOKEN_TTL,
      });

      setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'Strict',
        path: '/auth/refresh',
        maxAge: env.JWT_REFRESH_TOKEN_TTL,
      });

      auditLog({
        actorId: userId,
        action: usedRecovery ? 'auth.mfa.recovery_used' : 'auth.mfa.verified',
        resourceType: 'user',
        resourceId: userId,
        severity: usedRecovery ? 'warn' : 'info',
        ipAddress: c.get('clientIp'),
        requestId: c.get('requestId'),
        correlationId: c.get('correlationId'),
      });

      return c.json({ success: true, data: { message: 'Login successful' } });
    }

    // No challenge token — this is MFA setup confirmation (requires auth)
    // Manually check for auth cookie since we can't use authenticate middleware conditionally
    const userId = c.get('userId');
    if (!userId) {
      throw new ForbiddenError('Authentication required');
    }

    const enabled = await verifyAndEnableMfa(userId, code);
    if (!enabled) {
      throw new InvalidCredentialsError();
    }

    auditLog({
      actorId: userId,
      action: 'auth.mfa.enabled',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: c.get('clientIp'),
      requestId: c.get('requestId'),
      correlationId: c.get('correlationId'),
    });

    return c.json({ success: true, data: { message: 'MFA enabled successfully' } });
  },
);

// POST /mfa/disable — disable MFA (requires password + TOTP confirmation)
mfaRoutes.post(
  '/disable',
  rateLimiter(RATE_LIMITS.mfaAttempt, 'mfa-disable'),
  authenticate,
  validateBody(mfaDisableSchema),
  async (c) => {
    const userId = c.get('userId');
    const { password, code } = c.req.valid('json');

    // Verify password
    const user = await findUserById(userId);
    if (!user) throw new InvalidCredentialsError();

    const passwordValid = await verifyPassword(user.passwordHash, password);
    if (!passwordValid) throw new InvalidCredentialsError();

    // Verify TOTP
    const codeValid = await verifyMfaCode(userId, code);
    if (!codeValid) throw new InvalidCredentialsError();

    await disableMfa(userId);

    auditLog({
      actorId: userId,
      action: 'auth.mfa.disabled',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: c.get('clientIp'),
      requestId: c.get('requestId'),
      correlationId: c.get('correlationId'),
    });

    return c.json({ success: true, data: { message: 'MFA disabled' } });
  },
);

export { mfaRoutes };
