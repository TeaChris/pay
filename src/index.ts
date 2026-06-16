import { createApp } from './app.js'
import { serve } from '@hono/node-server'
import { loadKeys } from './config/keys.js'
import { loadEnv, getEnv } from './config/env.js'
import { closeDb } from './infrastructure/db/client.js'
import { getLogger } from './infrastructure/logging/logger.js'
import { initDummyHash } from './infrastructure/crypto/password.js'
import { seedRolesAndPermissions } from './modules/permissions/permission.service.js'
import { startEmailWorker, closeEmailWorker } from './modules/email/email.worker.js'
import { closeEmailQueue } from './modules/email/email.queue.js'

import {
      connectRedis,
      closeRedis,
      healthCheckRedis,
} from './infrastructure/redis/client.js'

async function main(): Promise<void> {
      // 1. Validate environment
      loadEnv()
      const env = getEnv()

      // 2. Initialize logger
      const logger = getLogger()
      logger.info({ env: env.NODE_ENV }, 'starting application...')

      // 3. Load JWT keys
      await loadKeys()
      logger.info('JWT keys loaded')

      // 3.5. Initialize timing-safe dummy hash
      await initDummyHash()

      // 4. Connect Redis
      await connectRedis()
      const redisOk = await healthCheckRedis()
      if (!redisOk) {
            logger.error('Redis health check failed')
            process.exit(1)
      }
      logger.info('Redis connected')

      // 5. Start email worker
      startEmailWorker()

      // 6. Seed roles and permissions
      await seedRolesAndPermissions()

      // 7. Create app
      const app = createApp()

      // 8. Start server
      const server = serve(
            {
                  fetch: app.fetch,
                  port: env.PORT,
            },
            (info) => {
                  logger.info(
                        { port: info.port },
                        `${env.APP_NAME} listening on port ${info.port}`,
                  )
            },
      )

      // ─── Graceful Shutdown ──────────────────────────────────────
      const shutdown = async (signal: string) => {
            logger.info({ signal }, 'shutting down gracefully...')

            server.close(() => {
                  logger.info('HTTP server closed')
            })

            await closeEmailWorker()
            await closeEmailQueue()
            logger.info('Email worker and queue closed')

            await closeRedis()
            logger.info('Redis connection closed')

            await closeDb()
            logger.info('Database connection closed')

            process.exit(0)
      }

      process.on('SIGINT', () => void shutdown('SIGINT'))
      process.on('SIGTERM', () => void shutdown('SIGTERM'))

      process.on('unhandledRejection', (reason) => {
            logger.error({ err: reason }, 'unhandled rejection')
      })

      process.on('uncaughtException', (err) => {
            logger.fatal({ err }, 'uncaught exception — shutting down')
            process.exit(1)
      })
}

main().catch((err: unknown) => {
      console.error('Fatal startup error:', err)
      process.exit(1)
})
