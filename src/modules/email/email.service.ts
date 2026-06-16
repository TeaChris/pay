/**
 * Email service — business-facing API for sending emails.
 *
 * All business services call these functions. They never interact with
 * templates, providers, or queues directly.
 *
 * Every function enqueues an email job asynchronously via BullMQ.
 * Email delivery never blocks business workflows.
 */

import { randomUUID } from 'node:crypto';
import { getLogger } from '../../infrastructure/logging/logger.js';
import { getEmailQueue } from './email.queue.js';
import type {
  EmailCategory,
  EmailType,
  TemplateData,
  EmailVerificationData,
  PasswordResetData,
  MagicLinkData,
  MfaVerificationData,
  AccountRecoveryData,
  NewDeviceLoginData,
  PasswordChangedData,
  EmailChangedData,
  SuspiciousActivityData,
  AccountLockedData,
  TransferSentData,
  TransferReceivedData,
  PaymentCompletedData,
  PaymentFailedData,
  RefundProcessedData,
  ProductUpdateData,
  ComplianceNotificationData,
  AccountAlertData,
} from './email.types.js';

// ─── Core Enqueue Function ──────────────────────────────────────

interface EnqueueEmailParams {
  to: string;
  type: EmailType;
  category: EmailCategory;
  data: TemplateData;
  correlationId?: string;
  /** Custom idempotency key. Auto-generated if not provided. */
  idempotencyKey?: string;
  /** Delay before processing (ms). */
  delay?: number;
}

/**
 * Enqueue an email for asynchronous delivery.
 * Fire-and-forget — errors are logged but never thrown to callers.
 */
export function enqueueEmail(params: EnqueueEmailParams): void {
  const logger = getLogger();
  const idempotencyKey = params.idempotencyKey ?? randomUUID();

  const jobData = {
    idempotencyKey,
    to: params.to,
    type: params.type,
    category: params.category,
    data: params.data,
    correlationId: params.correlationId,
    createdAt: new Date().toISOString(),
  };

  logger.info(
    {
      emailType: params.type,
      category: params.category,
      to: params.to,
      correlationId: params.correlationId,
      idempotencyKey,
    },
    'email queued',
  );

  const queue = getEmailQueue();
  queue
    .add(params.type, jobData, {
      ...(params.delay ? { delay: params.delay } : {}),
      jobId: idempotencyKey, // BullMQ deduplication by jobId
    })
    .catch((err: unknown) => {
      logger.error(
        { err, emailType: params.type, to: params.to, correlationId: params.correlationId },
        'failed to enqueue email',
      );
    });
}

// ─── Authentication Emails ──────────────────────────────────────

export function queueVerificationEmail(
  to: string,
  data: EmailVerificationData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'email_verification',
    category: 'auth',
    data,
    correlationId,
    idempotencyKey: `email_verification:${to}:${Date.now()}`,
  });
}

export function queueMagicLinkEmail(
  to: string,
  data: MagicLinkData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'magic_link',
    category: 'auth',
    data,
    correlationId,
  });
}

export function queuePasswordResetEmail(
  to: string,
  data: PasswordResetData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'password_reset',
    category: 'auth',
    data,
    correlationId,
    idempotencyKey: `password_reset:${to}:${Date.now()}`,
  });
}

export function queueMfaVerificationEmail(
  to: string,
  data: MfaVerificationData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'mfa_verification',
    category: 'auth',
    data,
    correlationId,
  });
}

export function queueAccountRecoveryEmail(
  to: string,
  data: AccountRecoveryData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'account_recovery',
    category: 'auth',
    data,
    correlationId,
  });
}

// ─── Security Emails ────────────────────────────────────────────

export function queueNewDeviceLoginEmail(
  to: string,
  data: NewDeviceLoginData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'new_device_login',
    category: 'security',
    data,
    correlationId,
  });
}

export function queuePasswordChangedEmail(
  to: string,
  data: PasswordChangedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'password_changed',
    category: 'security',
    data,
    correlationId,
  });
}

export function queueEmailChangedEmail(
  to: string,
  data: EmailChangedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'email_changed',
    category: 'security',
    data,
    correlationId,
  });
}

export function queueSuspiciousActivityEmail(
  to: string,
  data: SuspiciousActivityData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'suspicious_activity',
    category: 'security',
    data,
    correlationId,
  });
}

export function queueAccountLockedEmail(
  to: string,
  data: AccountLockedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'account_locked',
    category: 'security',
    data,
    correlationId,
  });
}

// ─── Transaction Emails ─────────────────────────────────────────

export function queueTransferSentEmail(
  to: string,
  data: TransferSentData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'transfer_sent',
    category: 'transaction',
    data,
    correlationId,
  });
}

export function queueTransferReceivedEmail(
  to: string,
  data: TransferReceivedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'transfer_received',
    category: 'transaction',
    data,
    correlationId,
  });
}

export function queuePaymentCompletedEmail(
  to: string,
  data: PaymentCompletedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'payment_completed',
    category: 'transaction',
    data,
    correlationId,
  });
}

export function queuePaymentFailedEmail(
  to: string,
  data: PaymentFailedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'payment_failed',
    category: 'transaction',
    data,
    correlationId,
  });
}

export function queueRefundProcessedEmail(
  to: string,
  data: RefundProcessedData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'refund_processed',
    category: 'transaction',
    data,
    correlationId,
  });
}

// ─── Notification Emails ────────────────────────────────────────

export function queueProductUpdateEmail(
  to: string,
  data: ProductUpdateData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'product_update',
    category: 'notification',
    data,
    correlationId,
  });
}

export function queueComplianceNotificationEmail(
  to: string,
  data: ComplianceNotificationData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'compliance_notification',
    category: 'notification',
    data,
    correlationId,
  });
}

export function queueAccountAlertEmail(
  to: string,
  data: AccountAlertData,
  correlationId?: string,
): void {
  enqueueEmail({
    to,
    type: 'account_alert',
    category: 'notification',
    data,
    correlationId,
  });
}
