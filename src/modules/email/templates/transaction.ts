/**
 * Transaction email templates.
 * Triggered by financial operations — transfers, payments, refunds.
 */

import type {
  TransferSentData,
  TransferReceivedData,
  PaymentCompletedData,
  PaymentFailedData,
  RefundProcessedData,
} from '../email.types.js';
import { renderLayout, stripHtmlToText, escapeHtml } from './layout.js';
import type { RenderedEmail } from './auth.js';

export function renderTransferSent(data: TransferSentData): RenderedEmail {
  const subject = `Transfer of ${data.currency} ${data.amount} sent`;
  const content = `
    <h1>Transfer Sent</h1>
    <p>Hi ${escapeHtml(data.userName)}, your transfer was successfully sent.</p>
    <div style="background-color: #f0fdf4; border-radius: 6px; padding: 16px; margin: 16px 0; border-left: 4px solid #22c55e;">
      <div class="detail-row">
        <p class="detail-label">Recipient</p>
        <p class="detail-value">${escapeHtml(data.recipientName)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Amount</p>
        <p class="detail-value">${escapeHtml(data.currency)} ${escapeHtml(data.amount)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Reference</p>
        <p class="detail-value">${escapeHtml(data.reference)}</p>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <p class="detail-label">Date</p>
        <p class="detail-value">${escapeHtml(data.sentAt)}</p>
      </div>
    </div>
  `;

  const html = renderLayout({ content, preheader: `You sent ${data.currency} ${data.amount} to ${data.recipientName}` });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderTransferReceived(data: TransferReceivedData): RenderedEmail {
  const subject = `You received ${data.currency} ${data.amount}`;
  const content = `
    <h1>Transfer Received</h1>
    <p>Hi ${escapeHtml(data.userName)}, you received a transfer.</p>
    <div style="background-color: #f0fdf4; border-radius: 6px; padding: 16px; margin: 16px 0; border-left: 4px solid #22c55e;">
      <div class="detail-row">
        <p class="detail-label">From</p>
        <p class="detail-value">${escapeHtml(data.senderName)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Amount</p>
        <p class="detail-value">${escapeHtml(data.currency)} ${escapeHtml(data.amount)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Reference</p>
        <p class="detail-value">${escapeHtml(data.reference)}</p>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <p class="detail-label">Date</p>
        <p class="detail-value">${escapeHtml(data.receivedAt)}</p>
      </div>
    </div>
  `;

  const html = renderLayout({ content, preheader: `${data.senderName} sent you ${data.currency} ${data.amount}` });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderPaymentCompleted(data: PaymentCompletedData): RenderedEmail {
  const subject = `Payment of ${data.currency} ${data.amount} completed`;
  const content = `
    <h1>Payment Completed</h1>
    <p>Hi ${escapeHtml(data.userName)}, your payment was processed successfully.</p>
    <div style="background-color: #f0fdf4; border-radius: 6px; padding: 16px; margin: 16px 0; border-left: 4px solid #22c55e;">
      <div class="detail-row">
        <p class="detail-label">Description</p>
        <p class="detail-value">${escapeHtml(data.description)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Amount</p>
        <p class="detail-value">${escapeHtml(data.currency)} ${escapeHtml(data.amount)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Reference</p>
        <p class="detail-value">${escapeHtml(data.reference)}</p>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <p class="detail-label">Date</p>
        <p class="detail-value">${escapeHtml(data.completedAt)}</p>
      </div>
    </div>
  `;

  const html = renderLayout({ content, preheader: `Payment of ${data.currency} ${data.amount} completed` });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderPaymentFailed(data: PaymentFailedData): RenderedEmail {
  const subject = `Payment of ${data.currency} ${data.amount} failed`;
  const content = `
    <h1>Payment Failed</h1>
    <p>Hi ${escapeHtml(data.userName)}, we were unable to process your payment.</p>
    <div class="alert-box alert-danger">
      <div class="detail-row">
        <p class="detail-label">Description</p>
        <p class="detail-value">${escapeHtml(data.description)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Amount</p>
        <p class="detail-value">${escapeHtml(data.currency)} ${escapeHtml(data.amount)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Reference</p>
        <p class="detail-value">${escapeHtml(data.reference)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Reason</p>
        <p class="detail-value">${escapeHtml(data.reason)}</p>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <p class="detail-label">Date</p>
        <p class="detail-value">${escapeHtml(data.failedAt)}</p>
      </div>
    </div>
    <p class="text-muted">Please check your payment method and try again.</p>
  `;

  const html = renderLayout({ content, preheader: `Your payment of ${data.currency} ${data.amount} could not be processed` });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderRefundProcessed(data: RefundProcessedData): RenderedEmail {
  const subject = `Refund of ${data.currency} ${data.amount} processed`;
  const content = `
    <h1>Refund Processed</h1>
    <p>Hi ${escapeHtml(data.userName)}, your refund has been processed.</p>
    <div style="background-color: #dbeafe; border-radius: 6px; padding: 16px; margin: 16px 0; border-left: 4px solid #2563eb;">
      <div class="detail-row">
        <p class="detail-label">Amount</p>
        <p class="detail-value">${escapeHtml(data.currency)} ${escapeHtml(data.amount)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Original reference</p>
        <p class="detail-value">${escapeHtml(data.originalReference)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">Refund reference</p>
        <p class="detail-value">${escapeHtml(data.refundReference)}</p>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <p class="detail-label">Date</p>
        <p class="detail-value">${escapeHtml(data.processedAt)}</p>
      </div>
    </div>
    <p class="text-muted">Funds will be returned to your original payment method within 5–10 business days.</p>
  `;

  const html = renderLayout({ content, preheader: `Your refund of ${data.currency} ${data.amount} has been processed` });
  return { subject, html, text: stripHtmlToText(html) };
}
