import { eq, and } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db/client.js';
import {
  emailVerifications,
  passwordResets,
  failedLoginAttempts,
  users,
} from '../../infrastructure/db/schema/index.js';
import {
  verifyPassword,
  DUMMY_HASH,
  hashPassword,
} from '../../infrastructure/crypto/password.js';
import { generateToken } from '../../infrastructure/crypto/tokens.js';
import { sha256 } from '../../infrastructure/crypto/hash.js';
import {
  InvalidCredentialsError,
  AccountLockedError,
  InvalidTokenError,
  TokenExpiredError,
  ConflictError,
} from '../../shared/errors.js';
import {
  EMAIL_VERIFICATION_TTL_SEC,
  PASSWORD_RESET_TTL_SEC,
} from '../../config/constants.js';
import { createUser, findUserByEmail, findUserById, updateLastLogin, incrementFailedLogins } from '../users/user.service.js';
import { getUserProfile } from '../users/user.service.js';
import { createSession, parseDeviceInfo, revokeAllUserSessions } from '../sessions/session.service.js';
import { signAccessToken, signMfaChallengeToken } from '../tokens/token.service.js';
import { createRefreshToken, rotateRefreshToken } from '../tokens/refresh.service.js';
import { revokeSession } from '../sessions/session.service.js';
import { auditLog } from '../audit/audit.service.js';

// ─── Registration ───────────────────────────────────────────────

interface RegisterParams {
  email: string;
  password: string;
  displayName?: string;
  ipAddress: string;
  userAgent: string | null;
  requestId: string;
  correlationId: string;
}

export async function register(params: RegisterParams) {
  const user = await createUser({
    email: params.email,
    password: params.password,
    displayName: params.displayName,
  });

  // Generate email verification token
  const rawToken = generateToken(32);
  const tokenHash = sha256(rawToken);

  const db = getDb();
  await db.insert(emailVerifications).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SEC * 1000),
  });

  auditLog({
    actorId: user.id,
    action: 'auth.register',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: params.ipAddress,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });

  return { userId: user.id, emailVerificationToken: rawToken };
}

// ─── Login ──────────────────────────────────────────────────────

interface LoginParams {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string | null;
  requestId: string;
  correlationId: string;
}

export async function login(params: LoginParams) {
  const db = getDb();
  const user = await findUserByEmail(params.email);

  // Timing-safe: always verify a hash even when user doesn't exist
  if (!user) {
    await verifyPassword(DUMMY_HASH, params.password);

    // Record failed attempt for IP tracking
    await db.insert(failedLoginAttempts).values({
      email: params.email.toLowerCase(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      reason: 'user_not_found',
    }).catch(() => { /* best effort */ });

    throw new InvalidCredentialsError();
  }

  // Check account lock
  if (user.accountLocked) {
    auditLog({
      actorId: user.id,
      action: 'auth.login.failed',
      resourceType: 'user',
      resourceId: user.id,
      details: { reason: 'account_locked' },
      severity: 'warn',
      ipAddress: params.ipAddress,
      requestId: params.requestId,
      correlationId: params.correlationId,
    });
    throw new AccountLockedError();
  }

  // Verify password
  const valid = await verifyPassword(user.passwordHash, params.password);
  if (!valid) {
    const locked = await incrementFailedLogins(user.id);

    await db.insert(failedLoginAttempts).values({
      userId: user.id,
      email: params.email.toLowerCase(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      reason: 'invalid_password',
    }).catch(() => { /* best effort */ });

    auditLog({
      actorId: user.id,
      action: 'auth.login.failed',
      resourceType: 'user',
      resourceId: user.id,
      details: { reason: 'invalid_password', accountLocked: locked },
      severity: locked ? 'critical' : 'warn',
      ipAddress: params.ipAddress,
      requestId: params.requestId,
      correlationId: params.correlationId,
    });

    if (locked) {
      auditLog({
        actorId: user.id,
        action: 'auth.account.locked',
        resourceType: 'user',
        resourceId: user.id,
        severity: 'critical',
        ipAddress: params.ipAddress,
        requestId: params.requestId,
        correlationId: params.correlationId,
      });
    }

    throw new InvalidCredentialsError();
  }

  // Check if MFA is enabled
  if (user.mfaEnabled) {
    const mfaChallengeToken = await signMfaChallengeToken(user.id);

    auditLog({
      actorId: user.id,
      action: 'auth.login.success',
      resourceType: 'user',
      resourceId: user.id,
      details: { mfaRequired: true },
      ipAddress: params.ipAddress,
      requestId: params.requestId,
      correlationId: params.correlationId,
    });

    return { mfaRequired: true as const, mfaChallengeToken };
  }

  // No MFA — complete login
  const profile = await getUserProfile(user.id);
  const deviceInfo = parseDeviceInfo(params.userAgent);
  const session = await createSession({
    userId: user.id,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    deviceInfo,
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    sessionId: session.id,
    role: profile.role,
    mfaVerified: false,
  });

  const { token: refreshToken } = await createRefreshToken(session.id);
  await updateLastLogin(user.id, params.ipAddress);

  auditLog({
    actorId: user.id,
    action: 'auth.login.success',
    resourceType: 'user',
    resourceId: user.id,
    details: { sessionId: session.id },
    ipAddress: params.ipAddress,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });

  return {
    mfaRequired: false as const,
    accessToken,
    refreshToken,
    session: { id: session.id },
  };
}

// ─── Logout ─────────────────────────────────────────────────────

interface LogoutParams {
  sessionId: string;
  userId: string;
  requestId: string;
  correlationId: string;
  ipAddress: string;
}

export async function logout(params: LogoutParams): Promise<void> {
  await revokeSession(params.sessionId, 'user_logout');

  auditLog({
    actorId: params.userId,
    action: 'auth.logout',
    resourceType: 'session',
    resourceId: params.sessionId,
    ipAddress: params.ipAddress,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });
}

// ─── Refresh ────────────────────────────────────────────────────

interface RefreshParams {
  rawRefreshToken: string;
  ipAddress: string;
  userAgent: string | null;
  requestId: string;
  correlationId: string;
}

export async function refresh(params: RefreshParams) {
  const { newToken, sessionId, userId } = await rotateRefreshToken(params.rawRefreshToken);

  const profile = await getUserProfile(userId);
  const user = await findUserById(userId);

  const accessToken = await signAccessToken({
    userId,
    sessionId,
    role: profile.role,
    mfaVerified: user?.mfaEnabled ?? false,
  });

  auditLog({
    actorId: userId,
    action: 'auth.refresh',
    resourceType: 'session',
    resourceId: sessionId,
    ipAddress: params.ipAddress,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });

  return { accessToken, refreshToken: newToken };
}

// ─── Email Verification ─────────────────────────────────────────

interface VerifyEmailParams {
  token: string;
  requestId: string;
  correlationId: string;
}

export async function verifyEmail(params: VerifyEmailParams): Promise<void> {
  const db = getDb();
  const tokenHash = sha256(params.token);

  const [record] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.tokenHash, tokenHash))
    .limit(1);

  if (!record) throw new InvalidTokenError();
  if (record.used) throw new InvalidTokenError();
  if (record.expiresAt < new Date()) throw new TokenExpiredError();

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerifications)
      .set({ used: true })
      .where(eq(emailVerifications.id, record.id));

    await tx
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, record.userId));
  });

  auditLog({
    actorId: record.userId,
    action: 'auth.email_verification.completed',
    resourceType: 'user',
    resourceId: record.userId,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });
}

// ─── Password Reset Request ────────────────────────────────────

interface RequestPasswordResetParams {
  email: string;
  ipAddress: string;
  requestId: string;
  correlationId: string;
}

export async function requestPasswordReset(
  params: RequestPasswordResetParams,
): Promise<{ token?: string }> {
  const user = await findUserByEmail(params.email);

  // Always return success for anti-enumeration
  if (!user) return {};

  const rawToken = generateToken(32);
  const tokenHash = sha256(rawToken);

  const db = getDb();
  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SEC * 1000),
    ipAddress: params.ipAddress,
  });

  auditLog({
    actorId: user.id,
    action: 'auth.password_reset.requested',
    resourceType: 'user',
    resourceId: user.id,
    ipAddress: params.ipAddress,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });

  return { token: rawToken };
}

// ─── Password Reset ────────────────────────────────────────────

interface ResetPasswordParams {
  token: string;
  newPassword: string;
  ipAddress: string;
  requestId: string;
  correlationId: string;
}

export async function resetPassword(params: ResetPasswordParams): Promise<void> {
  const db = getDb();
  const tokenHash = sha256(params.token);

  const [record] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash))
    .limit(1);

  if (!record) throw new InvalidTokenError();
  if (record.used) throw new InvalidTokenError();
  if (record.expiresAt < new Date()) throw new TokenExpiredError();

  const newPasswordHash = await hashPassword(params.newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResets)
      .set({ used: true, usedAt: new Date() })
      .where(eq(passwordResets.id, record.id));

    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, record.userId));
  });

  // Revoke all sessions after password reset
  await revokeAllUserSessions(record.userId);

  auditLog({
    actorId: record.userId,
    action: 'auth.password_reset.completed',
    resourceType: 'user',
    resourceId: record.userId,
    ipAddress: params.ipAddress,
    requestId: params.requestId,
    correlationId: params.correlationId,
  });
}
