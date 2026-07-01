import {
      uuid,
      text,
      jsonb,
      index,
      pgTable,
      varchar,
      timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

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
