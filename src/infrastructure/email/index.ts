import type { EmailProvider } from './provider.js';
import { ResendProvider } from './resend.provider.js';

export type { EmailProvider, EmailSendOptions, EmailSendResult } from './provider.js';

let _provider: EmailProvider | undefined;

/**
 * Get the singleton EmailProvider instance.
 * Follows the project's getter pattern (getDb, getLogger, getRedis).
 */
export function getEmailProvider(): EmailProvider {
  if (!_provider) {
    _provider = new ResendProvider();
  }
  return _provider;
}

/**
 * Override the provider instance (useful for testing).
 */
export function setEmailProvider(provider: EmailProvider): void {
  _provider = provider;
}

/**
 * Reset the provider (used in graceful shutdown / tests).
 */
export function resetEmailProvider(): void {
  _provider = undefined;
}
