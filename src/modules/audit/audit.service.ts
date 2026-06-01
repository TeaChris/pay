import { getDb } from '../../infrastructure/db/client.js'
import { getLogger } from '../../infrastructure/logging/logger.js'
import type { AuditAction, AuditSeverity } from '../../shared/types.js'
import {
      auditLogs,
      type NewAuditLog,
} from '../../infrastructure/db/schema/index.js'

export interface AuditLogParams {
      actorId?: string | null
      action: AuditAction
      resourceType?: string
      resourceId?: string
      details?: Record<string, unknown>
      ipAddress?: string
      userAgent?: string
      requestId?: string
      correlationId?: string
      severity?: AuditSeverity
}

/**
 * Write an audit log entry. Fire-and-forget — errors are logged but never thrown.
 * Also emits a structured log entry for external ingestion.
 */
export function auditLog(params: AuditLogParams): void {
      const logger = getLogger()
      const severity = params.severity ?? 'info'

      // Structured log emission (always synchronous)
      logger.info(
            {
                  audit: true,
                  action: params.action,
                  actorId: params.actorId ?? null,
                  resourceType: params.resourceType,
                  resourceId: params.resourceId,
                  severity,
                  requestId: params.requestId,
                  correlationId: params.correlationId,
                  details: params.details,
            },
            `audit: ${params.action}`,
      )

      // Database persistence
      const values: NewAuditLog = {
            actorId: params.actorId ?? null,
            action: params.action,
            resourceType: params.resourceType ?? null,
            resourceId: params.resourceId ?? null,
            details: params.details ?? null,
            ipAddress: params.ipAddress ?? null,
            userAgent: params.userAgent ?? null,
            requestId: params.requestId ?? null,
            correlationId: params.correlationId ?? null,
            severity,
      }

      if (severity === 'critical') {
            // Critical events: persist with retry for reliability
            void persistWithRetry(values, params.action)
      } else {
            // Non-critical: fire-and-forget
            const db = getDb()
            db.insert(auditLogs)
                  .values(values)
                  .catch((err: unknown) => {
                        logger.error(
                              { err, action: params.action },
                              'failed to persist audit log',
                        )
                  })
      }
}

const MAX_AUDIT_RETRIES = 3

async function persistWithRetry(
      values: NewAuditLog,
      action: string,
      attempt = 1,
): Promise<void> {
      const db = getDb()
      const logger = getLogger()
      try {
            await db.insert(auditLogs).values(values)
      } catch (err: unknown) {
            if (attempt < MAX_AUDIT_RETRIES) {
                  const delay = Math.min(100 * 2 ** attempt, 1000)
                  await new Promise((resolve) => setTimeout(resolve, delay))
                  return persistWithRetry(values, action, attempt + 1)
            }
            logger.error(
                  { err, action, attempts: attempt },
                  'CRITICAL: failed to persist critical audit log after retries',
            )
      }
}
