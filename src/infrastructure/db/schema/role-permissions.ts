import { uuid, pgTable, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { permissions } from './permissions.js'
import { roles } from './roles.js'
import { users } from './users.js'

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
