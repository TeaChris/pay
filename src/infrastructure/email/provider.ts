/**
 * Abstract email provider interface.
 * Business services depend on this contract — never on a concrete SDK.
 *
 * Implementations:
 *   ResendProvider  (current)
 *   Future: SESProvider, PostmarkProvider, etc.
 */

export interface EmailSendOptions {
  /** Sender address (RFC 5322). Falls back to config default. */
  from?: string;
  /** Recipient address(es). */
  to: string | string[];
  /** Email subject line. */
  subject: string;
  /** HTML body. */
  html: string;
  /** Plain-text fallback body. */
  text?: string;
  /** Reply-To address. Falls back to config default. */
  replyTo?: string;
  /** Optional tags for analytics / categorisation. */
  tags?: Array<{ name: string; value: string }>;
  /** Optional headers. */
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  /** Provider-assigned message ID. */
  id: string;
}

export interface EmailProvider {
  /**
   * Send a single email.
   * Throws on unrecoverable provider errors (network, auth, invalid payload).
   */
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;
}
