import {
      uuid,
      index,
      pgTable,
      varchar,
      boolean,
      integer,
      timestamp,
      uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sessions } from './sessions.js'

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
