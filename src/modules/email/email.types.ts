/**
 * Email system type definitions.
 * All email job payloads flow through the BullMQ queue as EmailJobData.
 */

// ─── Email Categories ───────────────────────────────────────────

export type EmailCategory =
  | 'auth'
  | 'security'
  | 'transaction'
  | 'notification';

// ─── Email Types ────────────────────────────────────────────────

export type AuthEmailType =
  | 'email_verification'
  | 'magic_link'
  | 'password_reset'
  | 'mfa_verification'
  | 'account_recovery';

export type SecurityEmailType =
  | 'new_device_login'
  | 'password_changed'
  | 'email_changed'
  | 'suspicious_activity'
  | 'account_locked';

export type TransactionEmailType =
  | 'transfer_sent'
  | 'transfer_received'
  | 'payment_completed'
  | 'payment_failed'
  | 'refund_processed';

export type NotificationEmailType =
  | 'product_update'
  | 'compliance_notification'
  | 'account_alert';

export type EmailType =
  | AuthEmailType
  | SecurityEmailType
  | TransactionEmailType
  | NotificationEmailType;

// ─── Template Data ──────────────────────────────────────────────

export interface EmailVerificationData {
  userName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface MagicLinkData {
  userName: string;
  magicLinkUrl: string;
  expiresInMinutes: number;
}

export interface PasswordResetData {
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
  ipAddress?: string;
}

export interface MfaVerificationData {
  userName: string;
  code: string;
  expiresInMinutes: number;
}

export interface AccountRecoveryData {
  userName: string;
  recoveryUrl: string;
  expiresInHours: number;
}

export interface NewDeviceLoginData {
  userName: string;
  deviceName: string;
  ipAddress: string;
  location?: string;
  loginTime: string;
}

export interface PasswordChangedData {
  userName: string;
  changedAt: string;
  ipAddress?: string;
}

export interface EmailChangedData {
  userName: string;
  oldEmail: string;
  newEmail: string;
  changedAt: string;
}

export interface SuspiciousActivityData {
  userName: string;
  activityDescription: string;
  ipAddress?: string;
  detectedAt: string;
}

export interface AccountLockedData {
  userName: string;
  reason: string;
  lockedAt: string;
  supportUrl?: string;
}

export interface TransferSentData {
  userName: string;
  recipientName: string;
  amount: string;
  currency: string;
  reference: string;
  sentAt: string;
}

export interface TransferReceivedData {
  userName: string;
  senderName: string;
  amount: string;
  currency: string;
  reference: string;
  receivedAt: string;
}

export interface PaymentCompletedData {
  userName: string;
  amount: string;
  currency: string;
  description: string;
  reference: string;
  completedAt: string;
}

export interface PaymentFailedData {
  userName: string;
  amount: string;
  currency: string;
  description: string;
  reference: string;
  reason: string;
  failedAt: string;
}

export interface RefundProcessedData {
  userName: string;
  amount: string;
  currency: string;
  originalReference: string;
  refundReference: string;
  processedAt: string;
}

export interface ProductUpdateData {
  userName: string;
  title: string;
  summary: string;
  detailsUrl?: string;
}

export interface ComplianceNotificationData {
  userName: string;
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  deadline?: string;
}

export interface AccountAlertData {
  userName: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionUrl?: string;
}

// ─── Template Data Union ────────────────────────────────────────

export type TemplateData =
  | EmailVerificationData
  | MagicLinkData
  | PasswordResetData
  | MfaVerificationData
  | AccountRecoveryData
  | NewDeviceLoginData
  | PasswordChangedData
  | EmailChangedData
  | SuspiciousActivityData
  | AccountLockedData
  | TransferSentData
  | TransferReceivedData
  | PaymentCompletedData
  | PaymentFailedData
  | RefundProcessedData
  | ProductUpdateData
  | ComplianceNotificationData
  | AccountAlertData;

// ─── Email Job Payload ──────────────────────────────────────────

export interface EmailJobData {
  /** Idempotency key — prevents duplicate sends on retry. */
  idempotencyKey: string;
  /** Recipient address. */
  to: string;
  /** Email type for template resolution. */
  type: EmailType;
  /** Category for routing / metrics. */
  category: EmailCategory;
  /** Template data — shape depends on `type`. */
  data: TemplateData;
  /** Optional correlation ID for tracing. */
  correlationId?: string;
  /** ISO timestamp of when the job was created. */
  createdAt: string;
}
