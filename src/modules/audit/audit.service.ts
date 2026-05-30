import { getDb } from '../../infrastructure/db/client.js';
import { auditLogs } from '../../infrastructure/db/schema/index.js';
import { getLogger } from '../../infrastructure/logging/logger.js';
import type { AuditAction, AuditSeverity } from '../../shared/types.js';

export interface AuditLogParams {
  actorId?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  severity?: AuditSeverity;
}

/**
 * Write an audit log entry. Fire-and-forget — errors are logged but never thrown.
 * Also emits a structured log entry for external ingestion.
 */
export function auditLog(params: AuditLogParams): void {
  const logger = getLogger();

  // Structured log emission (always synchronous)
  logger.info(
    {
      audit: true,
      action: params.action,
      actorId: params.actorId ?? null,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      severity: params.severity ?? 'info',
      requestId: params.requestId,
      correlationId: params.correlationId,
      details: params.details,
    },
    `audit: ${params.action}`,
  );

  // Database persistence (fire-and-forget)
  const db = getDb();
  db.insert(auditLogs)
    .values({
      actorId: params.actorId ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      requestId: params.requestId ?? null,
      correlationId: params.correlationId ?? null,
      severity: params.severity ?? 'info',
    })
    .catch((err: unknown) => {
      logger.error({ err, action: params.action }, 'failed to persist audit log');
    });
}
