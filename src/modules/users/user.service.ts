import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db/client.js';
import { users, roles } from '../../infrastructure/db/schema/index.js';
import { hashPassword } from '../../infrastructure/crypto/password.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { UserProfile } from '../../shared/types.js';
import { ACCOUNT_LOCK_THRESHOLD } from '../../config/constants.js';
import { getLogger } from '../../infrastructure/logging/logger.js';

/**
 * Find a non-deleted user by email.
 */
export async function findUserByEmail(email: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}

/**
 * Find a non-deleted user by ID.
 */
export async function findUserById(id: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  return user ?? null;
}

/**
 * Create a new user with hashed password and default 'user' role.
 */
export async function createUser(params: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const db = getDb();
  const email = params.email.toLowerCase();

  // Check for existing user
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  // Resolve default role
  const [defaultRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, 'user'))
    .limit(1);

  const passwordHash = await hashPassword(params.password);

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName: params.displayName ?? null,
      roleId: defaultRole?.id ?? null,
    })
    .returning();

  return newUser!;
}

/**
 * Get user profile with role name joined.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      emailVerified: users.emailVerified,
      mfaEnabled: users.mfaEnabled,
      roleName: roles.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('User');
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    emailVerified: row.emailVerified,
    mfaEnabled: row.mfaEnabled,
    role: row.roleName ?? 'user',
    createdAt: row.createdAt,
  };
}

/**
 * Update last login timestamp and IP, reset failed login counter.
 */
export async function updateLastLogin(userId: string, ip: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      failedLoginCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Increment failed login counter. Locks account if threshold exceeded.
 * Returns whether the account was locked.
 */
export async function incrementFailedLogins(userId: string): Promise<boolean> {
  const db = getDb();
  const logger = getLogger();

  const [user] = await db
    .select({ failedLoginCount: users.failedLoginCount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return false;

  const newCount = user.failedLoginCount + 1;
  const shouldLock = newCount >= ACCOUNT_LOCK_THRESHOLD;

  await db
    .update(users)
    .set({
      failedLoginCount: newCount,
      lastFailedLogin: new Date(),
      ...(shouldLock
        ? {
            accountLocked: true,
            accountLockedAt: new Date(),
            lockReason: `Exceeded ${ACCOUNT_LOCK_THRESHOLD} failed login attempts`,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  if (shouldLock) {
    logger.warn({ userId, attempts: newCount }, 'account locked due to failed logins');
  }

  return shouldLock;
}

/**
 * Lock a user account.
 */
export async function lockAccount(userId: string, reason: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({
      accountLocked: true,
      accountLockedAt: new Date(),
      lockReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Unlock a user account and reset failed login counter.
 */
export async function unlockAccount(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({
      accountLocked: false,
      accountLockedAt: null,
      lockReason: null,
      failedLoginCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
