import { eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../shared/types.js'
import { ForbiddenError } from '../shared/errors.js'
import { getDb } from '../infrastructure/db/client.js'
import { RedisKeys } from '../infrastructure/redis/keys.js'
import { getRedis } from '../infrastructure/redis/client.js'
import { PERMISSION_CACHE_TTL_SEC } from '../config/constants.js'
import {
      rolePermissions,
      permissions,
} from '../infrastructure/db/schema/index.js'

/**
 * Load permissions for a role, checking Redis cache first.
 */
async function loadPermissions(role: string): Promise<Set<string>> {
      const redis = getRedis()
      const cacheKey = RedisKeys.permissions(role)

      // Try cache first
      const cached = await redis.smembers(cacheKey)
      if (cached.length > 0) {
            return new Set(cached)
      }

      // Cache miss — load from DB
      const db = getDb()
      const rows = await db
            .select({ permissionName: permissions.name })
            .from(rolePermissions)
            .innerJoin(
                  permissions,
                  eq(rolePermissions.permissionId, permissions.id),
            )
            .innerJoin(
                  (await import('../infrastructure/db/schema/index.js')).roles,
                  eq(
                        rolePermissions.roleId,
                        (await import('../infrastructure/db/schema/index.js'))
                              .roles.id,
                  ),
            )
            .where(
                  eq(
                        (await import('../infrastructure/db/schema/index.js'))
                              .roles.name,
                        role,
                  ),
            )

      const permSet = new Set(rows.map((r) => r.permissionName))

      // Cache the result
      if (permSet.size > 0) {
            const pipeline = redis.pipeline()
            pipeline.sadd(cacheKey, ...permSet)
            pipeline.expire(cacheKey, PERMISSION_CACHE_TTL_SEC)
            await pipeline.exec()
      }

      return permSet
}

/**
 * RBAC authorization middleware factory.
 * Checks that the authenticated user's role has ALL required permissions.
 *
 * @param requiredPermissions - Permission names the user must have (AND logic)
 */
export function authorize(...requiredPermissions: string[]) {
      return createMiddleware<AppEnv>(async (c, next) => {
            const role = c.get('userRole')

            if (!role) {
                  throw new ForbiddenError()
            }

            // Admin bypasses all permission checks
            if (role === 'admin') {
                  await next()
                  return
            }

            const userPermissions = await loadPermissions(role)

            for (const perm of requiredPermissions) {
                  if (!userPermissions.has(perm)) {
                        throw new ForbiddenError()
                  }
            }

            await next()
      })
}
