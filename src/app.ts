import { Hono } from 'hono'
import type { AppEnv } from './shared/types.js'
import { requestId } from './middleware/request-id.js'
import { ipExtract } from './middleware/ip-extract.js'
import { mfaRoutes } from './modules/mfa/mfa.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { createCorsMiddleware } from './middleware/cors.js'
import { REQUEST_BODY_MAX_SIZE } from './config/constants.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestLogger } from './middleware/request-logger.js'
import { securityHeaders } from './middleware/secure-headers.js'
import { sessionRoutes } from './modules/sessions/session.routes.js'

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  // ─── Global Error Handler ───────────────────────────────────
  app.onError(errorHandler)

  // ─── Global Middleware (order matters) ──────────────────────
  app.use('*', requestId)
  app.use('*', ipExtract)
  app.use('*', requestLogger)
  app.use('*', securityHeaders)
  app.use('*', createCorsMiddleware())

  // ─── Body Size Limit ──────────────────────────────────────────
  app.use('*', async (c, next) => {
    const contentLength = c.req.header('content-length')
    if (contentLength && parseInt(contentLength, 10) > REQUEST_BODY_MAX_SIZE) {
      return c.json(
        { success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } },
        413,
      )
    }
    await next()
  })

  // ─── Health Check ──────────────────────────────────────────
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // ─── Route Mounting ────────────────────────────────────────
  app.route('/auth', authRoutes)
  app.route('/auth/sessions', sessionRoutes)
  app.route('/auth/mfa', mfaRoutes)

  // ─── 404 Handler ──────────────────────────────────────────
  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Route not found' },
      },
      404,
    )
  })

  return app
}
