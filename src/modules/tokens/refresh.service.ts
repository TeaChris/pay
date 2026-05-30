import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db/client.js';
import { refreshTokens, sessions } from '../../infrastructure/db/schema/index.js';
import { generateToken } from '../../infrastructure/crypto/tokens.js';
import { sha256 } from '../../infrastructure/crypto/hash.js';
import { getEnv } from '../../config/env.js';
import {
  InvalidTokenError,
  TokenExpiredError,
  SessionRevokedError,
  RefreshTokenReplayError,
} from '../../shared/errors.js';
import { auditLog } from '../audit/audit.service.js';
import { getLogger } from '../../infrastructure/logging/logger.js';

/**
 * Create a new refresh token for a session.
 * Returns the raw (unhashed) token and the token family UUID.
 */
export async function createRefreshToken(
  sessionId: string,
): Promise<{ token: string; tokenFamily: string }> {
  const db = getDb();
  const env = getEnv();
  const rawToken = generateToken(32);
  const tokenHash = sha256(rawToken);
  const tokenFamily = randomUUID();

  await db.insert(refreshTokens).values({
    sessionId,
    tokenHash,
    tokenFamily,
    generation: 1,
    expiresAt: new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000),
  });

  return { token: rawToken, tokenFamily };
}

/**
 * Core refresh token rotation with replay detection.
 *
 * Flow:
 * 1. Hash incoming token → lookup
 * 2. Not found → invalid
 * 3. Found but used → REPLAY: revoke entire family + session
 * 4. Found but expired → expired
 * 5. Session revoked → session revoked
 * 6. Mark old used, create new with generation+1
 * 7. Return new token + session metadata
 */
export async function rotateRefreshToken(rawToken: string): Promise<{
  newToken: string;
  sessionId: string;
  userId: string;
}> {
  const db = getDb();
  const env = getEnv();
  const logger = getLogger();
  const tokenHash = sha256(rawToken);

  // 1. Look up the token
  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!existing) {
    throw new InvalidTokenError();
  }

  // 2. REPLAY DETECTION — token already used
  if (existing.used) {
    logger.error(
      { tokenFamily: existing.tokenFamily, generation: existing.generation },
      'REFRESH TOKEN REPLAY DETECTED — revoking entire family',
    );

    // Revoke ALL tokens in this family
    await revokeTokenFamily(existing.tokenFamily);

    // Revoke the session
    await db
      .update(sessions)
      .set({ revoked: true, revokedAt: new Date(), revokeReason: 'refresh_token_replay' })
      .where(eq(sessions.id, existing.sessionId));

    auditLog({
      action: 'auth.refresh_replay_detected',
      resourceType: 'session',
      resourceId: existing.sessionId,
      severity: 'critical',
      details: {
        tokenFamily: existing.tokenFamily,
        generation: existing.generation,
      },
    });

    throw new RefreshTokenReplayError();
  }

  // 3. Check expiry
  if (existing.expiresAt < new Date()) {
    throw new TokenExpiredError();
  }

  // 4. Check session validity
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, existing.sessionId))
    .limit(1);

  if (!session) {
    throw new InvalidTokenError();
  }

  if (session.revoked) {
    throw new SessionRevokedError();
  }

  if (session.expiresAt < new Date()) {
    throw new TokenExpiredError();
  }

  // 5. Mark old token as used
  const newRawToken = generateToken(32);
  const newTokenHash = sha256(newRawToken);

  // 6. Atomic: mark old + create new
  await db.transaction(async (tx) => {
    // Insert new token first to get its ID
    const [newRow] = await tx
      .insert(refreshTokens)
      .values({
        sessionId: existing.sessionId,
        tokenHash: newTokenHash,
        tokenFamily: existing.tokenFamily,
        generation: existing.generation + 1,
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000),
      })
      .returning({ id: refreshTokens.id });

    // Mark old token as used
    await tx
      .update(refreshTokens)
      .set({
        used: true,
        usedAt: new Date(),
        replacedById: newRow!.id,
      })
      .where(eq(refreshTokens.id, existing.id));

    // Update session activity
    await tx
      .update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, existing.sessionId));
  });

  return {
    newToken: newRawToken,
    sessionId: session.id,
    userId: session.userId,
  };
}

/**
 * Revoke all refresh tokens in a family.
 */
export async function revokeTokenFamily(tokenFamily: string): Promise<void> {
  const db = getDb();
  await db
    .update(refreshTokens)
    .set({ used: true, usedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenFamily, tokenFamily),
        eq(refreshTokens.used, false),
      ),
    );
}

/**
 * Revoke all refresh tokens for a session.
 */
export async function revokeSessionTokens(sessionId: string): Promise<void> {
  const db = getDb();
  await db
    .update(refreshTokens)
    .set({ used: true, usedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.sessionId, sessionId),
        eq(refreshTokens.used, false),
      ),
    );
}
