import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { roles } from './roles.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    passwordHash: text('password_hash').notNull(),
    displayName: varchar('display_name', { length: 100 }),
    roleId: uuid('role_id').references(() => roles.id),
    mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
    accountLocked: boolean('account_locked').default(false).notNull(),
    accountLockedAt: timestamp('account_locked_at', { withTimezone: true }),
    lockReason: text('lock_reason'),
    failedLoginCount: integer('failed_login_count').default(0).notNull(),
    lastFailedLogin: timestamp('last_failed_login', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: text('last_login_ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_email_active_idx')
      .on(table.email)
      .where(sql`${table.deletedAt} IS NULL`),
    index('users_role_id_idx').on(table.roleId),
  ],
);
