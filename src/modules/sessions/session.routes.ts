import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { AppEnv } from '../../shared/types.js'
import { auditLog } from '../audit/audit.service.js'
import { RATE_LIMITS } from '../../config/constants.js'
import { getDb } from '../../infrastructure/db/client.js'
import { validateParams } from '../../middleware/validate.js'
import { rateLimiter } from '../../middleware/rate-limiter.js'
import { authenticate } from '../../middleware/authenticate.js'
import { revokeSessionParamsSchema } from './session.schemas.js'
import { sessions } from '../../infrastructure/db/schema/index.js'
import { getUserSessions, revokeSession } from './session.service.js'
import { ForbiddenError, NotFoundError } from '../../shared/errors.js'

const sessionRoutes = new Hono<AppEnv>()

// GET /sessions — list user's active sessions
sessionRoutes.get(
      '/',
      rateLimiter(RATE_LIMITS.general, 'sessions-list'),
      authenticate,
      async (c) => {
            const userId = c.get('userId')
            const sessionId = c.get('sessionId')
            const data = await getUserSessions(userId, sessionId)
            return c.json({ success: true, data })
      },
)

// DELETE /sessions/:id — revoke a specific session
sessionRoutes.delete(
      '/:id',
      rateLimiter(RATE_LIMITS.general, 'sessions-revoke'),
      authenticate,
      validateParams(revokeSessionParamsSchema),
      async (c) => {
            const userId = c.get('userId')
            const userRole = c.get('userRole')
            const targetId = c.req.param('id')

            // Check ownership — users can only revoke their own sessions (admin can revoke any)
            const db = getDb()
            const [targetSession] = await db
                  .select({ userId: sessions.userId })
                  .from(sessions)
                  .where(eq(sessions.id, targetId))
                  .limit(1)

            if (!targetSession) {
                  throw new NotFoundError('Session')
            }

            if (targetSession.userId !== userId && userRole !== 'admin') {
                  throw new ForbiddenError()
            }

            await revokeSession(targetId, 'user_revoked')

            auditLog({
                  actorId: userId,
                  action: 'auth.session.revoked',
                  resourceType: 'session',
                  resourceId: targetId,
                  ipAddress: c.get('clientIp'),
                  userAgent: c.req.header('user-agent') ?? undefined,
                  requestId: c.get('requestId'),
                  correlationId: c.get('correlationId'),
            })

            return c.json({
                  success: true,
                  data: { message: 'Session revoked' },
            })
      },
)

export { sessionRoutes }
