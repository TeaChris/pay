import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

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
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked: boolean('revoked').default(false).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokeReason: text('revoke_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    index('sessions_user_revoked_idx').on(table.userId, table.revoked),
  ],
);
