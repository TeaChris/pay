import { eq } from 'drizzle-orm'
import { getDb } from '../../infrastructure/db/client.js'
import { RedisKeys } from '../../infrastructure/redis/keys.js'
import { getRedis } from '../../infrastructure/redis/client.js'
import { getLogger } from '../../infrastructure/logging/logger.js'
import { PERMISSION_CACHE_TTL_SEC } from '../../config/constants.js'
import {
      DEFAULT_ROLES,
      DEFAULT_PERMISSIONS,
      ROLE_PERMISSION_MAP,
} from './rbac.constants.js'
import {
      roles,
      permissions,
      rolePermissions,
} from '../../infrastructure/db/schema/index.js'

/**
 * Get permissions for a role. Checks Redis cache first, then DB.
 */
export async function getUserPermissions(role: string): Promise<string[]> {
      const redis = getRedis()
      const cacheKey = RedisKeys.permissions(role)

      // Try cache
      const cached = await redis.smembers(cacheKey)
      if (cached.length > 0) {
            return cached
      }

      // Load from DB
      const db = getDb()
      const rows = await db
            .select({ permissionName: permissions.name })
            .from(rolePermissions)
            .innerJoin(
                  permissions,
                  eq(rolePermissions.permissionId, permissions.id),
            )
            .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
            .where(eq(roles.name, role))

      const permNames = rows.map((r) => r.permissionName)

      // Cache
      if (permNames.length > 0) {
            const pipeline = redis.pipeline()
            pipeline.sadd(cacheKey, ...permNames)
            pipeline.expire(cacheKey, PERMISSION_CACHE_TTL_SEC)
            await pipeline.exec()
      }

      return permNames
}

/**
 * Invalidate the Redis permission cache for a role.
 */
export async function invalidatePermissionCache(role: string): Promise<void> {
      const redis = getRedis()
      await redis.del(RedisKeys.permissions(role))
}

/**
 * Idempotent seed of default roles and permissions.
 * Safe to call on every startup.
 */
export async function seedRolesAndPermissions(): Promise<void> {
      const logger = getLogger()
      const db = getDb()

      logger.info('seeding roles and permissions...')

      // Upsert roles
      for (const roleName of DEFAULT_ROLES) {
            await db
                  .insert(roles)
                  .values({
                        name: roleName,
                        description: `${roleName} role`,
                        isSystem: true,
                  })
                  .onConflictDoNothing({ target: roles.name })
      }

      // Upsert permissions
      for (const perm of DEFAULT_PERMISSIONS) {
            await db
                  .insert(permissions)
                  .values({
                        name: perm.name,
                        resource: perm.resource,
                        action: perm.action,
                        description: perm.description,
                  })
                  .onConflictDoNothing({ target: permissions.name })
      }

      // Load all roles and permissions from DB for ID resolution
      const allRoles = await db.select().from(roles)
      const allPerms = await db.select().from(permissions)

      const roleMap = new Map(allRoles.map((r) => [r.name, r.id]))
      const permMap = new Map(allPerms.map((p) => [p.name, p.id]))

      // Assign permissions to roles
      for (const [roleName, permNames] of Object.entries(ROLE_PERMISSION_MAP)) {
            const roleId = roleMap.get(roleName)
            if (!roleId) continue

            for (const permName of permNames) {
                  const permId = permMap.get(permName)
                  if (!permId) continue

                  await db
                        .insert(rolePermissions)
                        .values({ roleId, permissionId: permId })
                        .onConflictDoNothing()
            }
      }

      // Invalidate all permission caches
      const redis = getRedis()
      for (const roleName of DEFAULT_ROLES) {
            await redis.del(RedisKeys.permissions(roleName))
      }

      logger.info('roles and permissions seeded successfully')
}
