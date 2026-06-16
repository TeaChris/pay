import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailProvider, EmailSendOptions, EmailSendResult } from '../../src/infrastructure/email/provider.js';
import { setEmailProvider, getEmailProvider, resetEmailProvider } from '../../src/infrastructure/email/index.js';

// ─── Mock Provider ──────────────────────────────────────────────

class MockEmailProvider implements EmailProvider {
  public sentEmails: EmailSendOptions[] = [];
  public shouldFail = false;
  public failureMessage = 'Mock provider failure';

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }
    this.sentEmails.push(options);
    return { id: `mock_${Date.now()}_${this.sentEmails.length}` };
  }

  reset(): void {
    this.sentEmails = [];
    this.shouldFail = false;
  }
}

describe('EmailProvider Interface', () => {
  let mockProvider: MockEmailProvider;

  beforeEach(() => {
    mockProvider = new MockEmailProvider();
    setEmailProvider(mockProvider);
  });

  it('should return singleton provider via getEmailProvider', () => {
    const provider1 = getEmailProvider();
    const provider2 = getEmailProvider();
    expect(provider1).toBe(provider2);
  });

  it('should allow provider override via setEmailProvider', () => {
    const customProvider = new MockEmailProvider();
    setEmailProvider(customProvider);
    expect(getEmailProvider()).toBe(customProvider);
  });

  it('should reset provider via resetEmailProvider', () => {
    resetEmailProvider();
    // After reset, getEmailProvider would create a new instance
    // (which would be the real ResendProvider in production)
    // We just verify the reset doesn't throw
    expect(() => resetEmailProvider()).not.toThrow();
  });
});

describe('MockEmailProvider (validates interface contract)', () => {
  let provider: MockEmailProvider;

  beforeEach(() => {
    provider = new MockEmailProvider();
  });

  it('should send an email and return a message ID', async () => {
    const options: EmailSendOptions = {
      to: 'user@example.com',
      subject: 'Test Email',
      html: '<p>Hello</p>',
      text: 'Hello',
    };

    const result = await provider.sendEmail(options);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(provider.sentEmails).toHaveLength(1);
    expect(provider.sentEmails[0]!.to).toBe('user@example.com');
    expect(provider.sentEmails[0]!.subject).toBe('Test Email');
  });

  it('should accept multiple recipients as array', async () => {
    const options: EmailSendOptions = {
      to: ['a@example.com', 'b@example.com'],
      subject: 'Bulk',
      html: '<p>Hi</p>',
    };

    const result = await provider.sendEmail(options);
    expect(result.id).toBeDefined();
    expect(provider.sentEmails[0]!.to).toEqual(['a@example.com', 'b@example.com']);
  });

  it('should accept optional fields', async () => {
    const options: EmailSendOptions = {
      to: 'user@example.com',
      subject: 'With extras',
      html: '<p>Hi</p>',
      text: 'Hi',
      from: 'custom@example.com',
      replyTo: 'reply@example.com',
      tags: [{ name: 'category', value: 'auth' }],
      headers: { 'X-Custom': 'value' },
    };

    const result = await provider.sendEmail(options);
    expect(result.id).toBeDefined();

    const sent = provider.sentEmails[0]!;
    expect(sent.from).toBe('custom@example.com');
    expect(sent.replyTo).toBe('reply@example.com');
    expect(sent.tags).toEqual([{ name: 'category', value: 'auth' }]);
    expect(sent.headers).toEqual({ 'X-Custom': 'value' });
  });

  it('should throw on provider failure', async () => {
    provider.shouldFail = true;
    provider.failureMessage = 'API rate limited';

    await expect(
      provider.sendEmail({
        to: 'user@example.com',
        subject: 'Fail',
        html: '<p>Fail</p>',
      }),
    ).rejects.toThrow('API rate limited');
  });

  it('should track multiple sends independently', async () => {
    await provider.sendEmail({ to: 'a@example.com', subject: 'First', html: '<p>1</p>' });
    await provider.sendEmail({ to: 'b@example.com', subject: 'Second', html: '<p>2</p>' });

    expect(provider.sentEmails).toHaveLength(2);
    expect(provider.sentEmails[0]!.subject).toBe('First');
    expect(provider.sentEmails[1]!.subject).toBe('Second');
  });

  it('should generate unique message IDs per send', async () => {
    const r1 = await provider.sendEmail({ to: 'a@example.com', subject: 'A', html: '<p>a</p>' });
    const r2 = await provider.sendEmail({ to: 'b@example.com', subject: 'B', html: '<p>b</p>' });

    expect(r1.id).not.toBe(r2.id);
  });
});
