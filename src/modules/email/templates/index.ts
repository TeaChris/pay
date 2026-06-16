/**
 * Template barrel export and resolver.
 * Maps EmailType → rendered { subject, html, text }.
 */

import type { EmailType, TemplateData } from '../email.types.js';
import type { RenderedEmail } from './auth.js';

export type { RenderedEmail } from './auth.js';

// Auth templates
import {
  renderEmailVerification,
  renderMagicLink,
  renderPasswordReset,
  renderMfaVerification,
  renderAccountRecovery,
} from './auth.js';

// Security templates
import {
  renderNewDeviceLogin,
  renderPasswordChanged,
  renderEmailChanged,
  renderSuspiciousActivity,
  renderAccountLocked,
} from './security.js';

// Transaction templates
import {
  renderTransferSent,
  renderTransferReceived,
  renderPaymentCompleted,
  renderPaymentFailed,
  renderRefundProcessed,
} from './transaction.js';

// Notification templates
import {
  renderProductUpdate,
  renderComplianceNotification,
  renderAccountAlert,
} from './notification.js';

/**
 * Template renderer registry.
 * To add a new email type: add the type to EmailType, create the template,
 * and register it here. No other changes needed.
 */
const templateRenderers: Record<EmailType, (data: never) => RenderedEmail> = {
  // Auth
  email_verification: renderEmailVerification as (data: never) => RenderedEmail,
  magic_link: renderMagicLink as (data: never) => RenderedEmail,
  password_reset: renderPasswordReset as (data: never) => RenderedEmail,
  mfa_verification: renderMfaVerification as (data: never) => RenderedEmail,
  account_recovery: renderAccountRecovery as (data: never) => RenderedEmail,

  // Security
  new_device_login: renderNewDeviceLogin as (data: never) => RenderedEmail,
  password_changed: renderPasswordChanged as (data: never) => RenderedEmail,
  email_changed: renderEmailChanged as (data: never) => RenderedEmail,
  suspicious_activity: renderSuspiciousActivity as (data: never) => RenderedEmail,
  account_locked: renderAccountLocked as (data: never) => RenderedEmail,

  // Transaction
  transfer_sent: renderTransferSent as (data: never) => RenderedEmail,
  transfer_received: renderTransferReceived as (data: never) => RenderedEmail,
  payment_completed: renderPaymentCompleted as (data: never) => RenderedEmail,
  payment_failed: renderPaymentFailed as (data: never) => RenderedEmail,
  refund_processed: renderRefundProcessed as (data: never) => RenderedEmail,

  // Notification
  product_update: renderProductUpdate as (data: never) => RenderedEmail,
  compliance_notification: renderComplianceNotification as (data: never) => RenderedEmail,
  account_alert: renderAccountAlert as (data: never) => RenderedEmail,
};

/**
 * Resolve an EmailType to its rendered email content.
 * Throws if the type has no registered renderer.
 */
export function renderTemplate(type: EmailType, data: TemplateData): RenderedEmail {
  const renderer = templateRenderers[type];
  if (!renderer) {
    throw new Error(`No template renderer registered for email type: ${type}`);
  }
  return renderer(data as never);
}

// Re-export individual renderers for direct usage
export {
  renderEmailVerification,
  renderMagicLink,
  renderPasswordReset,
  renderMfaVerification,
  renderAccountRecovery,
  renderNewDeviceLogin,
  renderPasswordChanged,
  renderEmailChanged,
  renderSuspiciousActivity,
  renderAccountLocked,
  renderTransferSent,
  renderTransferReceived,
  renderPaymentCompleted,
  renderPaymentFailed,
  renderRefundProcessed,
  renderProductUpdate,
  renderComplianceNotification,
  renderAccountAlert,
};
