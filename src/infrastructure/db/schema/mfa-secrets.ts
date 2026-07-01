import {
      uuid,
      text,
      pgTable,
      integer,
      varchar,
      boolean,
      timestamp,
      uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users.js'

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
