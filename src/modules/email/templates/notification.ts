/**
 * Notification email templates.
 * Product updates, compliance notices, and account alerts.
 */

import type {
  ProductUpdateData,
  ComplianceNotificationData,
  AccountAlertData,
} from '../email.types.js';
import { renderLayout, stripHtmlToText, escapeHtml } from './layout.js';
import type { RenderedEmail } from './auth.js';

export function renderProductUpdate(data: ProductUpdateData): RenderedEmail {
  const subject = data.title;
  const content = `
    <h1>${escapeHtml(data.title)}</h1>
    <p>Hi ${escapeHtml(data.userName)},</p>
    <p>${escapeHtml(data.summary)}</p>
    ${data.detailsUrl ? `<div class="text-center mt-24"><a href="${escapeHtml(data.detailsUrl)}" class="btn">Learn More</a></div>` : ''}
  `;

  const html = renderLayout({ content, preheader: data.summary });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderComplianceNotification(data: ComplianceNotificationData): RenderedEmail {
  const subject = `${data.actionRequired ? '[Action Required] ' : ''}${data.title}`;
  const alertClass = data.actionRequired ? 'alert-warning' : 'alert-info';
  const content = `
    <h1>${escapeHtml(data.title)}</h1>
    <p>Hi ${escapeHtml(data.userName)},</p>
    <div class="alert-box ${alertClass}">
      <p style="margin: 0;">${escapeHtml(data.message)}</p>
      ${data.deadline ? `<p style="margin: 8px 0 0 0; font-weight: 600;">Deadline: ${escapeHtml(data.deadline)}</p>` : ''}
    </div>
    ${data.actionUrl ? `<div class="text-center mt-24"><a href="${escapeHtml(data.actionUrl)}" class="btn">Take Action</a></div>` : ''}
  `;

  const html = renderLayout({ content, preheader: data.message });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderAccountAlert(data: AccountAlertData): RenderedEmail {
  const subject = data.title;
  const alertClassMap = { info: 'alert-info', warning: 'alert-warning', critical: 'alert-danger' } as const;
  const alertClass = alertClassMap[data.severity];
  const content = `
    <h1>${escapeHtml(data.title)}</h1>
    <p>Hi ${escapeHtml(data.userName)},</p>
    <div class="alert-box ${alertClass}">
      <p style="margin: 0;">${escapeHtml(data.message)}</p>
    </div>
    ${data.actionUrl ? `<div class="text-center mt-24"><a href="${escapeHtml(data.actionUrl)}" class="btn">View Details</a></div>` : ''}
  `;

  const html = renderLayout({ content, preheader: data.message });
  return { subject, html, text: stripHtmlToText(html) };
}
