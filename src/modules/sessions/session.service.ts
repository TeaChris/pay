import { eq, and, gt, desc } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db/client.js';
import { sessions } from '../../infrastructure/db/schema/index.js';
import { revokeSessionTokens } from '../tokens/refresh.service.js';
import { MAX_SESSIONS_PER_USER, SESSION_IDLE_TIMEOUT_SEC } from '../../config/constants.js';
import { getEnv } from '../../config/env.js';
import type { SessionInfo, DeviceInfo } from '../../shared/types.js';

/**
 * Create a new session record. Enforces max sessions per user.
 */
export async function createSession(params: {
  userId: string;
  ipAddress: string;
  userAgent: string | null;
  deviceInfo: DeviceInfo;
}): Promise<{ id: string }> {
  const db = getDb();
  const env = getEnv();

  // Enforce max sessions: revoke oldest if at limit
  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, params.userId),
        eq(sessions.revoked, false),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(sessions.createdAt));

  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    // Revoke the oldest sessions to make room
    const toRevoke = activeSessions.slice(MAX_SESSIONS_PER_USER - 1);
    for (const s of toRevoke) {
      await revokeSession(s.id, 'max_sessions_exceeded');
    }
  }

  const [session] = await db
    .insert(sessions)
    .values({
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceName: params.deviceInfo.deviceName,
      deviceType: params.deviceInfo.deviceType,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000),
    })
    .returning({ id: sessions.id });

  return session!;
}

/**
 * List active (non-revoked, non-expired) sessions for a user.
 */
export async function getUserSessions(
  userId: string,
  currentSessionId: string,
): Promise<SessionInfo[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.revoked, false),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(sessions.lastActiveAt));

  return rows.map((row) => ({
    id: row.id,
    deviceName: row.deviceName,
    deviceType: row.deviceType,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    lastActiveAt: row.lastActiveAt,
    createdAt: row.createdAt,
    current: row.id === currentSessionId,
  }));
}

/**
 * Revoke a single session and all its refresh tokens.
 */
export async function revokeSession(
  sessionId: string,
  reason?: string,
): Promise<void> {
  const db = getDb();

  await db
    .update(sessions)
    .set({
      revoked: true,
      revokedAt: new Date(),
      revokeReason: reason ?? 'user_revoked',
    })
    .where(eq(sessions.id, sessionId));

  await revokeSessionTokens(sessionId);
}

/**
 * Revoke all sessions for a user, optionally except one.
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  const db = getDb();

  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.revoked, false),
      ),
    );

  for (const session of activeSessions) {
    if (exceptSessionId && session.id === exceptSessionId) continue;
    await revokeSession(session.id, 'all_sessions_revoked');
  }
}

/**
 * Update session last active timestamp.
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const db = getDb();
  await db
    .update(sessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/**
 * Check if a session is valid (not revoked, not expired, not idle-timed-out).
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const db = getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return false;
  if (session.revoked) return false;
  if (session.expiresAt < new Date()) return false;

  // Idle timeout check
  const idleThreshold = new Date(Date.now() - SESSION_IDLE_TIMEOUT_SEC * 1000);
  if (session.lastActiveAt < idleThreshold) return false;

  return true;
}

/**
 * Parse a User-Agent string into basic device info.
 */
export function parseDeviceInfo(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return { deviceName: null, deviceType: null, userAgent: null };
  }

  let deviceType: string | null = null;
  if (/mobile|android|iphone|ipad/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }

  // Extract browser name
  let deviceName: string | null = null;
  if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) {
    deviceName = 'Chrome';
  } else if (/firefox/i.test(userAgent)) {
    deviceName = 'Firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    deviceName = 'Safari';
  } else if (/edge|edg/i.test(userAgent)) {
    deviceName = 'Edge';
  } else {
    deviceName = 'Unknown Browser';
  }

  return { deviceName, deviceType, userAgent };
}
