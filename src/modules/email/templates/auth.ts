/**
 * Authentication email templates.
 * Each function returns { subject, html, text } for the email service.
 */

import type {
  EmailVerificationData,
  MagicLinkData,
  PasswordResetData,
  MfaVerificationData,
  AccountRecoveryData,
} from '../email.types.js';
import { renderLayout, stripHtmlToText, escapeHtml } from './layout.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderEmailVerification(data: EmailVerificationData): RenderedEmail {
  const subject = 'Verify your email address';
  const content = `
    <h1>Welcome, ${escapeHtml(data.userName)}!</h1>
    <p>Thank you for creating your account. Please verify your email address to get started.</p>
    <div class="text-center mt-24 mb-24">
      <a href="${escapeHtml(data.verificationUrl)}" class="btn">Verify Email Address</a>
    </div>
    <p class="text-muted">This link expires in ${data.expiresInHours} hour${data.expiresInHours !== 1 ? 's' : ''}.</p>
    <p class="text-muted">If you didn't create this account, you can safely ignore this email.</p>
  `;

  const html = renderLayout({ content, preheader: 'Verify your email to activate your account' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderMagicLink(data: MagicLinkData): RenderedEmail {
  const subject = 'Your sign-in link';
  const content = `
    <h1>Hi ${escapeHtml(data.userName)},</h1>
    <p>Use the link below to sign in to your account. No password needed.</p>
    <div class="text-center mt-24 mb-24">
      <a href="${escapeHtml(data.magicLinkUrl)}" class="btn">Sign In</a>
    </div>
    <p class="text-muted">This link expires in ${data.expiresInMinutes} minute${data.expiresInMinutes !== 1 ? 's' : ''}.</p>
    <p class="text-muted">If you didn't request this, you can safely ignore this email.</p>
  `;

  const html = renderLayout({ content, preheader: 'Your secure sign-in link is ready' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderPasswordReset(data: PasswordResetData): RenderedEmail {
  const subject = 'Reset your password';
  const content = `
    <h1>Password Reset</h1>
    <p>Hi ${escapeHtml(data.userName)}, we received a request to reset your password.</p>
    <div class="text-center mt-24 mb-24">
      <a href="${escapeHtml(data.resetUrl)}" class="btn">Reset Password</a>
    </div>
    <p class="text-muted">This link expires in ${data.expiresInMinutes} minute${data.expiresInMinutes !== 1 ? 's' : ''}.</p>
    ${data.ipAddress ? `<p class="text-muted">Request originated from IP: ${escapeHtml(data.ipAddress)}</p>` : ''}
    <p class="text-muted">If you didn't request this, your account is safe — no changes have been made.</p>
  `;

  const html = renderLayout({ content, preheader: 'Reset your password' });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderMfaVerification(data: MfaVerificationData): RenderedEmail {
  const subject = 'Your verification code';
  const content = `
    <h1>Verification Code</h1>
    <p>Hi ${escapeHtml(data.userName)}, use the code below to complete your sign-in.</p>
    <div class="code-block">${escapeHtml(data.code)}</div>
    <p class="text-muted">This code expires in ${data.expiresInMinutes} minute${data.expiresInMinutes !== 1 ? 's' : ''}.</p>
    <p class="text-muted">If you didn't request this code, please secure your account immediately.</p>
  `;

  const html = renderLayout({ content, preheader: `Your verification code is ${data.code}` });
  return { subject, html, text: stripHtmlToText(html) };
}

export function renderAccountRecovery(data: AccountRecoveryData): RenderedEmail {
  const subject = 'Recover your account';
  const content = `
    <h1>Account Recovery</h1>
    <p>Hi ${escapeHtml(data.userName)}, we received a request to recover your account.</p>
    <div class="text-center mt-24 mb-24">
      <a href="${escapeHtml(data.recoveryUrl)}" class="btn">Recover Account</a>
    </div>
    <p class="text-muted">This link expires in ${data.expiresInHours} hour${data.expiresInHours !== 1 ? 's' : ''}.</p>
    <p class="text-muted">If you didn't request this, please contact support immediately.</p>
  `;

  const html = renderLayout({ content, preheader: 'Recover access to your account' });
  return { subject, html, text: stripHtmlToText(html) };
}
