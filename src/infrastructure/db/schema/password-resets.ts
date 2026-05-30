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

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').default(false).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('password_resets_hash_idx').on(table.tokenHash),
    index('password_resets_user_idx').on(table.userId),
    index('password_resets_expires_idx').on(table.expiresAt),
  ],
);
