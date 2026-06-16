import { describe, it, expect } from 'vitest';

import {
  renderEmailVerification,
  renderMagicLink,
  renderPasswordReset,
  renderMfaVerification,
  renderAccountRecovery,
} from '../../src/modules/email/templates/auth.js';
import {
  renderNewDeviceLogin,
  renderPasswordChanged,
  renderEmailChanged,
  renderSuspiciousActivity,
  renderAccountLocked,
} from '../../src/modules/email/templates/security.js';
import {
  renderTransferSent,
  renderTransferReceived,
  renderPaymentCompleted,
  renderPaymentFailed,
  renderRefundProcessed,
} from '../../src/modules/email/templates/transaction.js';
import {
  renderProductUpdate,
  renderComplianceNotification,
  renderAccountAlert,
} from '../../src/modules/email/templates/notification.js';
import { renderTemplate } from '../../src/modules/email/templates/index.js';
import { renderLayout, stripHtmlToText, escapeHtml } from '../../src/modules/email/templates/layout.js';

// ─── Layout Tests ───────────────────────────────────────────────

describe('Email Layout', () => {
  it('should wrap content in branded HTML', () => {
    const html = renderLayout({ content: '<p>Hello World</p>' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<p>Hello World</p>');
    expect(html).toContain('pay-auth-test'); // APP_NAME from test env
  });

  it('should include preheader text', () => {
    const html = renderLayout({
      content: '<p>Test</p>',
      preheader: 'Preview text here',
    });
    expect(html).toContain('Preview text here');
  });

  it('should escape HTML in preheader', () => {
    const html = renderLayout({
      content: '<p>Test</p>',
      preheader: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should allow custom footer text', () => {
    const html = renderLayout({
      content: '<p>Test</p>',
      footerText: 'Custom Footer Inc.',
    });
    expect(html).toContain('Custom Footer Inc.');
  });
});

describe('stripHtmlToText', () => {
  it('should strip HTML tags', () => {
    const text = stripHtmlToText('<h1>Hello</h1><p>World</p>');
    expect(text).toContain('Hello');
    expect(text).toContain('World');
    expect(text).not.toContain('<h1>');
    expect(text).not.toContain('<p>');
  });

  it('should convert HTML entities', () => {
    const text = stripHtmlToText('&amp; &lt; &gt; &quot; &#39;');
    expect(text).toBe('& < > " \'');
  });
});

describe('escapeHtml', () => {
  it('should escape special characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    expect(escapeHtml("it's")).toBe("it&#39;s");
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
});

// ─── Auth Templates ─────────────────────────────────────────────

describe('Auth Email Templates', () => {
  it('renderEmailVerification should render correctly', () => {
    const result = renderEmailVerification({
      userName: 'Alice',
      verificationUrl: 'https://example.com/verify?token=abc123',
      expiresInHours: 24,
    });

    expect(result.subject).toBe('Verify your email address');
    expect(result.html).toContain('Alice');
    expect(result.html).toContain('https://example.com/verify?token=abc123');
    expect(result.html).toContain('24 hours');
    expect(result.text).toContain('Alice');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('renderMagicLink should render correctly', () => {
    const result = renderMagicLink({
      userName: 'Bob',
      magicLinkUrl: 'https://example.com/magic?token=xyz',
      expiresInMinutes: 15,
    });

    expect(result.subject).toBe('Your sign-in link');
    expect(result.html).toContain('Bob');
    expect(result.html).toContain('https://example.com/magic?token=xyz');
    expect(result.html).toContain('15 minutes');
  });

  it('renderPasswordReset should render correctly', () => {
    const result = renderPasswordReset({
      userName: 'Carol',
      resetUrl: 'https://example.com/reset?token=def',
      expiresInMinutes: 60,
      ipAddress: '192.168.1.1',
    });

    expect(result.subject).toBe('Reset your password');
    expect(result.html).toContain('Carol');
    expect(result.html).toContain('https://example.com/reset?token=def');
    expect(result.html).toContain('192.168.1.1');
    expect(result.html).toContain('60 minutes');
  });

  it('renderPasswordReset should omit IP when not provided', () => {
    const result = renderPasswordReset({
      userName: 'Carol',
      resetUrl: 'https://example.com/reset',
      expiresInMinutes: 60,
    });

    expect(result.html).not.toContain('From IP');
  });

  it('renderMfaVerification should render code correctly', () => {
    const result = renderMfaVerification({
      userName: 'Dave',
      code: '482916',
      expiresInMinutes: 5,
    });

    expect(result.subject).toBe('Your verification code');
    expect(result.html).toContain('482916');
    expect(result.html).toContain('code-block');
  });

  it('renderAccountRecovery should render correctly', () => {
    const result = renderAccountRecovery({
      userName: 'Eve',
      recoveryUrl: 'https://example.com/recover',
      expiresInHours: 48,
    });

    expect(result.subject).toBe('Recover your account');
    expect(result.html).toContain('Eve');
    expect(result.html).toContain('https://example.com/recover');
  });
});

// ─── Security Templates ─────────────────────────────────────────

describe('Security Email Templates', () => {
  it('renderNewDeviceLogin should render device details', () => {
    const result = renderNewDeviceLogin({
      userName: 'Frank',
      deviceName: 'Chrome on Windows',
      ipAddress: '10.0.0.1',
      location: 'London, UK',
      loginTime: '2024-01-15 14:30 UTC',
    });

    expect(result.subject).toBe('New device sign-in detected');
    expect(result.html).toContain('Chrome on Windows');
    expect(result.html).toContain('10.0.0.1');
    expect(result.html).toContain('London, UK');
  });

  it('renderPasswordChanged should render change details', () => {
    const result = renderPasswordChanged({
      userName: 'Grace',
      changedAt: '2024-01-15 14:30 UTC',
      ipAddress: '192.168.0.1',
    });

    expect(result.subject).toBe('Your password was changed');
    expect(result.html).toContain('Grace');
    expect(result.html).toContain('192.168.0.1');
  });

  it('renderEmailChanged should render both emails', () => {
    const result = renderEmailChanged({
      userName: 'Heidi',
      oldEmail: 'old@example.com',
      newEmail: 'new@example.com',
      changedAt: '2024-01-15',
    });

    expect(result.subject).toBe('Your email address was changed');
    expect(result.html).toContain('old@example.com');
    expect(result.html).toContain('new@example.com');
  });

  it('renderSuspiciousActivity should render alert', () => {
    const result = renderSuspiciousActivity({
      userName: 'Ivan',
      activityDescription: 'Multiple login attempts from different countries',
      ipAddress: '203.0.113.1',
      detectedAt: '2024-01-15',
    });

    expect(result.subject).toContain('Suspicious activity');
    expect(result.html).toContain('Multiple login attempts from different countries');
    expect(result.html).toContain('alert-danger');
  });

  it('renderAccountLocked should render lock details', () => {
    const result = renderAccountLocked({
      userName: 'Judy',
      reason: 'Exceeded 10 failed login attempts',
      lockedAt: '2024-01-15',
      supportUrl: 'https://example.com/support',
    });

    expect(result.subject).toBe('Your account has been locked');
    expect(result.html).toContain('Exceeded 10 failed login attempts');
    expect(result.html).toContain('https://example.com/support');
  });
});

// ─── Transaction Templates ──────────────────────────────────────

describe('Transaction Email Templates', () => {
  it('renderTransferSent should render transfer details', () => {
    const result = renderTransferSent({
      userName: 'Alice',
      recipientName: 'Bob',
      amount: '500.00',
      currency: 'USD',
      reference: 'TXN-001',
      sentAt: '2024-01-15',
    });

    expect(result.subject).toContain('USD');
    expect(result.subject).toContain('500.00');
    expect(result.html).toContain('Bob');
    expect(result.html).toContain('TXN-001');
  });

  it('renderTransferReceived should render sender details', () => {
    const result = renderTransferReceived({
      userName: 'Bob',
      senderName: 'Alice',
      amount: '250.00',
      currency: 'EUR',
      reference: 'TXN-002',
      receivedAt: '2024-01-15',
    });

    expect(result.subject).toContain('EUR');
    expect(result.subject).toContain('250.00');
    expect(result.html).toContain('Alice');
  });

  it('renderPaymentCompleted should render success details', () => {
    const result = renderPaymentCompleted({
      userName: 'Carol',
      amount: '99.99',
      currency: 'GBP',
      description: 'Monthly subscription',
      reference: 'PAY-001',
      completedAt: '2024-01-15',
    });

    expect(result.subject).toContain('completed');
    expect(result.html).toContain('Monthly subscription');
  });

  it('renderPaymentFailed should render failure reason', () => {
    const result = renderPaymentFailed({
      userName: 'Dave',
      amount: '75.00',
      currency: 'USD',
      description: 'Invoice payment',
      reference: 'PAY-002',
      reason: 'Insufficient funds',
      failedAt: '2024-01-15',
    });

    expect(result.subject).toContain('failed');
    expect(result.html).toContain('Insufficient funds');
    expect(result.html).toContain('alert-danger');
  });

  it('renderRefundProcessed should render refund details', () => {
    const result = renderRefundProcessed({
      userName: 'Eve',
      amount: '25.00',
      currency: 'USD',
      originalReference: 'PAY-001',
      refundReference: 'REF-001',
      processedAt: '2024-01-15',
    });

    expect(result.subject).toContain('Refund');
    expect(result.html).toContain('PAY-001');
    expect(result.html).toContain('REF-001');
  });
});

// ─── Notification Templates ─────────────────────────────────────

describe('Notification Email Templates', () => {
  it('renderProductUpdate should render update details', () => {
    const result = renderProductUpdate({
      userName: 'Frank',
      title: 'New Feature: Instant Transfers',
      summary: 'You can now send money instantly.',
      detailsUrl: 'https://example.com/updates',
    });

    expect(result.subject).toBe('New Feature: Instant Transfers');
    expect(result.html).toContain('Frank');
    expect(result.html).toContain('send money instantly');
    expect(result.html).toContain('https://example.com/updates');
  });

  it('renderComplianceNotification should handle action required', () => {
    const result = renderComplianceNotification({
      userName: 'Grace',
      title: 'KYC Verification Needed',
      message: 'Please complete your identity verification.',
      actionRequired: true,
      actionUrl: 'https://example.com/kyc',
      deadline: '2024-02-01',
    });

    expect(result.subject).toContain('[Action Required]');
    expect(result.html).toContain('alert-warning');
    expect(result.html).toContain('2024-02-01');
  });

  it('renderComplianceNotification should handle info-only', () => {
    const result = renderComplianceNotification({
      userName: 'Grace',
      title: 'Updated Terms of Service',
      message: 'Our terms have been updated.',
      actionRequired: false,
    });

    expect(result.subject).not.toContain('[Action Required]');
    expect(result.html).toContain('alert-info');
  });

  it('renderAccountAlert should use correct severity styling', () => {
    const critical = renderAccountAlert({
      userName: 'Heidi',
      title: 'Account Compromise Detected',
      message: 'Unusual activity detected.',
      severity: 'critical',
    });
    expect(critical.html).toContain('alert-danger');

    const warning = renderAccountAlert({
      userName: 'Heidi',
      title: 'Low Balance',
      message: 'Your balance is low.',
      severity: 'warning',
    });
    expect(warning.html).toContain('alert-warning');

    const info = renderAccountAlert({
      userName: 'Heidi',
      title: 'Deposit Received',
      message: 'Your deposit was received.',
      severity: 'info',
    });
    expect(info.html).toContain('alert-info');
  });
});

// ─── Template Registry ──────────────────────────────────────────

describe('Template Registry (renderTemplate)', () => {
  it('should resolve email_verification type', () => {
    const result = renderTemplate('email_verification', {
      userName: 'Test',
      verificationUrl: 'https://example.com/verify',
      expiresInHours: 24,
    });
    expect(result.subject).toBe('Verify your email address');
    expect(result.html).toContain('Test');
  });

  it('should resolve transfer_sent type', () => {
    const result = renderTemplate('transfer_sent', {
      userName: 'Test',
      recipientName: 'Recipient',
      amount: '100.00',
      currency: 'USD',
      reference: 'REF-123',
      sentAt: '2024-01-01',
    });
    expect(result.subject).toContain('USD');
  });

  it('should resolve account_alert type', () => {
    const result = renderTemplate('account_alert', {
      userName: 'Test',
      title: 'Alert Title',
      message: 'Alert message',
      severity: 'info' as const,
    });
    expect(result.subject).toBe('Alert Title');
  });

  it('should throw for unknown email type', () => {
    expect(() =>
      renderTemplate('nonexistent_type' as any, {} as any),
    ).toThrow('No template renderer registered');
  });

  it('should produce both HTML and text for all types', () => {
    const result = renderTemplate('password_reset', {
      userName: 'Test',
      resetUrl: 'https://example.com/reset',
      expiresInMinutes: 60,
    });
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).not.toContain('<');
  });
});
