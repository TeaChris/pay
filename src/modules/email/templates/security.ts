/**
 * Security email templates.
 * Triggered by account security events.
 */

import type {
  NewDeviceLoginData,
  PasswordChangedData,
  EmailChangedData,
  SuspiciousActivityData,
  AccountLockedData,
} from '../email.types.js';
import { renderLayout, stripHtmlToText, escapeHtml } from './layout.js';
import type { RenderedEmail } from './auth.js';

export function renderNewDeviceLogin(data: NewDeviceLoginData): RenderedEmail {
  const subject = 'New device sign-in detected';
  const content = `
    <h1>New Sign-In Detected</h1>
    <p>Hi ${escapeHtml(data.userName)}, your account was just accessed from a new device.</p>
    <div class="alert-box alert-info">
      <div class="detail-row">
        <p class="detail-label">Device</p>
        <p class="detail-value">${escapeHtml(data.deviceName)}</p>
      </div>
      <div class="detail-row">
        <p class="detail-label">IP Address</p>
        <p class="detail-value">${escapeHtml(data.ipAddress)}</p>
      </div>
      ${data.location ? `<div class="detail-row"><p class="detail-label">Location</p><p class="detail-value">${escapeHtml(data.location)}</p></div>` : ''}
      <div class="detail-row" style="border-bottom: none;">
        <p class="detail-label">Time</p>
        <p class="detail-value">${escapeHtml(data.loginTime)}</p>
      </div>
    </div>
    <p class="text-muted">If this was you, no action is needed. If you don't recognise this activity, please secure your account immediately.</p>
  `;

  const html = renderLayout({ content, preheader: 'A new device signed in to your account' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderPasswordChanged(data: PasswordChangedData): RenderedEmail {
  const subject = 'Your password was changed';
  const content = `
    <h1>Password Changed</h1>
    <p>Hi ${escapeHtml(data.userName)}, your account password was successfully changed.</p>
    <div class="detail-row">
      <p class="detail-label">Changed at</p>
      <p class="detail-value">${escapeHtml(data.changedAt)}</p>
    </div>
    ${data.ipAddress ? `<div class="detail-row"><p class="detail-label">From IP</p><p class="detail-value">${escapeHtml(data.ipAddress)}</p></div>` : ''}
    <div class="alert-box alert-warning mt-24">
      <p style="margin: 0; color: #92400e; font-size: 14px;">If you didn't make this change, please contact support immediately.</p>
    </div>
  `;

  const html = renderLayout({ content, preheader: 'Your account password was just changed' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderEmailChanged(data: EmailChangedData): RenderedEmail {
  const subject = 'Your email address was changed';
  const content = `
    <h1>Email Address Changed</h1>
    <p>Hi ${escapeHtml(data.userName)}, the email address on your account was changed.</p>
    <div class="detail-row">
      <p class="detail-label">Previous email</p>
      <p class="detail-value">${escapeHtml(data.oldEmail)}</p>
    </div>
    <div class="detail-row">
      <p class="detail-label">New email</p>
      <p class="detail-value">${escapeHtml(data.newEmail)}</p>
    </div>
    <div class="detail-row">
      <p class="detail-label">Changed at</p>
      <p class="detail-value">${escapeHtml(data.changedAt)}</p>
    </div>
    <div class="alert-box alert-warning mt-24">
      <p style="margin: 0; color: #92400e; font-size: 14px;">If you didn't make this change, please contact support immediately.</p>
    </div>
  `;

  const html = renderLayout({ content, preheader: 'Your account email was changed' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderSuspiciousActivity(data: SuspiciousActivityData): RenderedEmail {
  const subject = 'Suspicious activity detected on your account';
  const content = `
    <h1>⚠️ Suspicious Activity</h1>
    <p>Hi ${escapeHtml(data.userName)}, we detected unusual activity on your account.</p>
    <div class="alert-box alert-danger">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b;">${escapeHtml(data.activityDescription)}</p>
      ${data.ipAddress ? `<p style="margin: 0; color: #991b1b; font-size: 13px;">IP Address: ${escapeHtml(data.ipAddress)}</p>` : ''}
      <p style="margin: 4px 0 0 0; color: #991b1b; font-size: 13px;">Detected at: ${escapeHtml(data.detectedAt)}</p>
    </div>
    <p>We recommend changing your password and enabling two-factor authentication if you haven't already.</p>
  `;

  const html = renderLayout({ content, preheader: 'Unusual activity detected on your account' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderAccountLocked(data: AccountLockedData): RenderedEmail {
  const subject = 'Your account has been locked';
  const content = `
    <h1>Account Locked</h1>
    <p>Hi ${escapeHtml(data.userName)}, your account has been locked for your security.</p>
    <div class="alert-box alert-danger">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">Reason: ${escapeHtml(data.reason)}</p>
      <p style="margin: 4px 0 0 0; color: #991b1b; font-size: 13px;">Locked at: ${escapeHtml(data.lockedAt)}</p>
    </div>
    ${data.supportUrl ? `<div class="text-center mt-24"><a href="${escapeHtml(data.supportUrl)}" class="btn btn-danger">Contact Support</a></div>` : '<p>Please contact our support team to unlock your account.</p>'}
  `;

  const html = renderLayout({ content, preheader: 'Your account has been locked' });
  return { subject, html, text: stripHtmlToText(html) };
}
