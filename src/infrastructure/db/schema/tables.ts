import {
      uuid,
      text,
      jsonb,
      index,
      varchar,
      pgTable,
      integer,
      boolean,
      timestamp,
      primaryKey,
      uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Roles ──────────────────────────────────────────────────────
export const roles = pgTable(
      'roles',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            name: varchar('name', { length: 50 }).notNull().unique(),
            description: text('description'),
            isSystem: boolean('is_system').default(false).notNull(),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
            updatedAt: timestamp('updated_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [uniqueIndex('roles_name_idx').on(table.name)],
)

// ─── Users ──────────────────────────────────────────────────────
export const users = pgTable(
      'users',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            email: varchar('email', { length: 255 }).notNull(),
            emailVerified: boolean('email_verified').default(false).notNull(),
            emailVerifiedAt: timestamp('email_verified_at', {
                  withTimezone: true,
            }),
            passwordHash: text('password_hash').notNull(),
            displayName: varchar('display_name', { length: 100 }),
            roleId: uuid('role_id').references(() => roles.id),
            mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
            accountLocked: boolean('account_locked').default(false).notNull(),
            accountLockedAt: timestamp('account_locked_at', {
                  withTimezone: true,
            }),
            lockReason: text('lock_reason'),
            failedLoginCount: integer('failed_login_count')
                  .default(0)
                  .notNull(),
            lastFailedLogin: timestamp('last_failed_login', {
                  withTimezone: true,
            }),
            lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
            lastLoginIp: text('last_login_ip'),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
            updatedAt: timestamp('updated_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
            deletedAt: timestamp('deleted_at', { withTimezone: true }),
      },
      (table) => [
            uniqueIndex('users_email_active_idx')
                  .on(table.email)
                  .where(sql`${table.deletedAt} IS NULL`),
            index('users_role_id_idx').on(table.roleId),
      ],
)

// ─── Permissions ────────────────────────────────────────────────
export const permissions = pgTable(
      'permissions',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            name: varchar('name', { length: 100 }).notNull().unique(),
            description: text('description'),
            resource: varchar('resource', { length: 50 }).notNull(),
            action: varchar('action', { length: 50 }).notNull(),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            uniqueIndex('permissions_name_idx').on(table.name),
            uniqueIndex('permissions_resource_action_idx').on(
                  table.resource,
                  table.action,
            ),
      ],
)

// ─── Role Permissions ───────────────────────────────────────────
export const rolePermissions = pgTable(
      'role_permissions',
      {
            roleId: uuid('role_id')
                  .notNull()
                  .references(() => roles.id, { onDelete: 'cascade' }),
            permissionId: uuid('permission_id')
                  .notNull()
                  .references(() => permissions.id, { onDelete: 'cascade' }),
            grantedAt: timestamp('granted_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
            grantedBy: uuid('granted_by').references(() => users.id),
      },
      (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
)

// ─── Sessions ───────────────────────────────────────────────────
export const sessions = pgTable(
      'sessions',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            userId: uuid('user_id')
                  .notNull()
                  .references(() => users.id),
            deviceName: varchar('device_name', { length: 255 }),
            deviceType: varchar('device_type', { length: 50 }),
            ipAddress: text('ip_address'),
            userAgent: text('user_agent'),
            mfaVerified: boolean('mfa_verified').default(false).notNull(),
            lastActiveAt: timestamp('last_active_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
            expiresAt: timestamp('expires_at', {
                  withTimezone: true,
            }).notNull(),
            revoked: boolean('revoked').default(false).notNull(),
            revokedAt: timestamp('revoked_at', { withTimezone: true }),
            revokeReason: text('revoke_reason'),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            index('sessions_user_id_idx').on(table.userId),
            index('sessions_expires_at_idx').on(table.expiresAt),
            index('sessions_user_revoked_idx').on(table.userId, table.revoked),
      ],
)

// ─── Refresh Tokens ─────────────────────────────────────────────
export const refreshTokens = pgTable(
      'refresh_tokens',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            sessionId: uuid('session_id')
                  .notNull()
                  .references(() => sessions.id, { onDelete: 'cascade' }),
            tokenHash: varchar('token_hash', { length: 64 }).notNull(),
            tokenFamily: uuid('token_family').notNull(),
            generation: integer('generation').default(1).notNull(),
            expiresAt: timestamp('expires_at', {
                  withTimezone: true,
            }).notNull(),
            used: boolean('used').default(false).notNull(),
            usedAt: timestamp('used_at', { withTimezone: true }),
            replacedById: uuid('replaced_by_id'),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            uniqueIndex('refresh_tokens_hash_idx').on(table.tokenHash),
            index('refresh_tokens_session_idx').on(table.sessionId),
            index('refresh_tokens_family_idx').on(table.tokenFamily),
            index('refresh_tokens_expires_idx').on(table.expiresAt),
      ],
)

// ─── MFA Secrets ────────────────────────────────────────────────
export const mfaSecrets = pgTable(
      'mfa_secrets',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            userId: uuid('user_id')
                  .notNull()
                  .references(() => users.id),
            secretEncrypted: text('secret_encrypted').notNull(),
            algorithm: varchar('algorithm', { length: 10 })
                  .default('SHA1')
                  .notNull(),
            digits: integer('digits').default(6).notNull(),
            period: integer('period').default(30).notNull(),
            verified: boolean('verified').default(false).notNull(),
            recoveryCodes: text('recovery_codes').array(),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
            updatedAt: timestamp('updated_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            uniqueIndex('mfa_secrets_user_verified_idx')
                  .on(table.userId)
                  .where(sql`${table.verified} = true`),
      ],
)

// ─── Password Resets ────────────────────────────────────────────
export const passwordResets = pgTable(
      'password_resets',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            userId: uuid('user_id')
                  .notNull()
                  .references(() => users.id),
            tokenHash: varchar('token_hash', { length: 64 }).notNull(),
            expiresAt: timestamp('expires_at', {
                  withTimezone: true,
            }).notNull(),
            used: boolean('used').default(false).notNull(),
            usedAt: timestamp('used_at', { withTimezone: true }),
            ipAddress: text('ip_address'),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            index('password_resets_hash_idx').on(table.tokenHash),
            index('password_resets_user_idx').on(table.userId),
            index('password_resets_expires_idx').on(table.expiresAt),
      ],
)

// ─── Email Verifications ────────────────────────────────────────
export const emailVerifications = pgTable(
      'email_verifications',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            userId: uuid('user_id')
                  .notNull()
                  .references(() => users.id),
            tokenHash: varchar('token_hash', { length: 64 }).notNull(),
            expiresAt: timestamp('expires_at', {
                  withTimezone: true,
            }).notNull(),
            used: boolean('used').default(false).notNull(),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            index('email_verifications_hash_idx').on(table.tokenHash),
            index('email_verifications_user_idx').on(table.userId),
            index('email_verifications_expires_idx').on(table.expiresAt),
      ],
)

// ─── Failed Login Attempts ──────────────────────────────────────
export const failedLoginAttempts = pgTable(
      'failed_login_attempts',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            userId: uuid('user_id').references(() => users.id),
            email: varchar('email', { length: 255 }),
            ipAddress: text('ip_address').notNull(),
            userAgent: text('user_agent'),
            reason: varchar('reason', { length: 100 }),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            index('failed_logins_ip_created_idx').on(
                  table.ipAddress,
                  table.createdAt,
            ),
            index('failed_logins_user_created_idx').on(
                  table.userId,
                  table.createdAt,
            ),
            index('failed_logins_email_created_idx').on(
                  table.email,
                  table.createdAt,
            ),
      ],
)

// ─── Audit Logs ─────────────────────────────────────────────────
export const auditLogs = pgTable(
      'audit_logs',
      {
            id: uuid('id').defaultRandom().primaryKey(),
            actorId: uuid('actor_id').references(() => users.id),
            action: varchar('action', { length: 100 }).notNull(),
            resourceType: varchar('resource_type', { length: 50 }),
            resourceId: uuid('resource_id'),
            details: jsonb('details'),
            ipAddress: text('ip_address'),
            userAgent: text('user_agent'),
            requestId: varchar('request_id', { length: 128 }),
            correlationId: varchar('correlation_id', { length: 128 }),
            severity: varchar('severity', { length: 20 })
                  .default('info')
                  .notNull(),
            createdAt: timestamp('created_at', { withTimezone: true })
                  .defaultNow()
                  .notNull(),
      },
      (table) => [
            index('audit_logs_actor_idx').on(table.actorId),
            index('audit_logs_action_idx').on(table.action),
            index('audit_logs_resource_idx').on(
                  table.resourceType,
                  table.resourceId,
            ),
            index('audit_logs_created_idx').on(table.createdAt),
            index('audit_logs_correlation_idx').on(table.correlationId),
      ],
)
