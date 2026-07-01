import {
      uuid,
      text,
      pgTable,
      varchar,
      boolean,
      timestamp,
      uniqueIndex,
} from 'drizzle-orm/pg-core'

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
