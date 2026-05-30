import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const failedLoginAttempts = pgTable(
  'failed_login_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    email: varchar('email', { length: 255 }),
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent'),
    reason: varchar('reason', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('failed_logins_ip_created_idx').on(table.ipAddress, table.createdAt),
    index('failed_logins_user_created_idx').on(table.userId, table.createdAt),
    index('failed_logins_email_created_idx').on(table.email, table.createdAt),
  ],
);
