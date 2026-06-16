/**
 * Shared email layout — branded wrapper for all outgoing emails.
 * Provides consistent header, footer, and styling across all email types.
 * Localization-ready: all static copy is parameterised.
 */

import { getEnv } from '../../../config/env.js';

export interface LayoutOptions {
  /** Main HTML content to render inside the layout body. */
  content: string;
  /** Email preview / preheader text (visible in inbox list). */
  preheader?: string;
  /** Footer text override. Defaults to company branding. */
  footerText?: string;
}

/**
 * Wrap email content in the shared branded layout.
 */
export function renderLayout(options: LayoutOptions): string {
  const env = getEnv();
  const appName = env.APP_NAME;
  const year = new Date().getFullYear();
  const preheader = options.preheader ?? '';
  const footer = options.footerText ?? `© ${year} ${appName}. All rights reserved.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${appName}</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }

    /* Layout */
    .email-wrapper { background-color: #f4f4f7; width: 100%; }
    .email-content { width: 100%; max-width: 600px; margin: 0 auto; }
    .email-body { padding: 32px 24px; background-color: #ffffff; border-radius: 8px; margin: 24px 16px; }
    .email-header { padding: 24px 0; text-align: center; }
    .email-footer { padding: 16px 24px; text-align: center; color: #9b9b9b; font-size: 13px; }

    /* Typography */
    body, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    h1 { color: #1a1a2e; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3; }
    h2 { color: #1a1a2e; font-size: 20px; font-weight: 600; margin: 0 0 12px 0; line-height: 1.3; }
    p { color: #3d3d4e; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }

    /* Button */
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; line-height: 1; }
    .btn:hover { background-color: #1d4ed8; }
    .btn-danger { background-color: #dc2626; }
    .btn-danger:hover { background-color: #b91c1c; }

    /* Utility */
    .text-muted { color: #9b9b9b; font-size: 13px; }
    .text-center { text-align: center; }
    .mt-24 { margin-top: 24px; }
    .mb-24 { margin-bottom: 24px; }
    .code-block { background-color: #f4f4f7; border-radius: 6px; padding: 16px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 28px; letter-spacing: 6px; text-align: center; font-weight: 700; color: #1a1a2e; margin: 16px 0; }
    .detail-row { padding: 8px 0; border-bottom: 1px solid #f0f0f3; }
    .detail-label { color: #9b9b9b; font-size: 13px; margin: 0; }
    .detail-value { color: #1a1a2e; font-size: 15px; font-weight: 600; margin: 4px 0 0 0; }
    .alert-box { padding: 16px; border-radius: 6px; margin: 16px 0; }
    .alert-warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert-danger { background-color: #fee2e2; border-left: 4px solid #dc2626; }
    .alert-info { background-color: #dbeafe; border-left: 4px solid #2563eb; }

    /* Preheader */
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f4f4f7; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body>
  <span class="preheader">${escapeHtml(preheader)}</span>
  <table class="email-wrapper" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table class="email-content" role="presentation" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td class="email-header">
              <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${escapeHtml(appName)}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td>
              <div class="email-body">
                ${options.content}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <p style="margin: 0; color: #9b9b9b; font-size: 13px;">${escapeHtml(footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate a plain-text version (strip HTML and normalise whitespace).
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Escape HTML special characters.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
