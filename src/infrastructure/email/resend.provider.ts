import { Resend } from 'resend';
import { getEnv } from '../../config/env.js';
import { getLogger } from '../logging/logger.js';
import type { EmailProvider, EmailSendOptions, EmailSendResult } from './provider.js';

/**
 * Resend SDK adapter implementing EmailProvider.
 * Wraps the Resend API with structured logging and error normalisation.
 */
export class ResendProvider implements EmailProvider {
  private readonly client: Resend;

  constructor(apiKey?: string) {
    this.client = new Resend(apiKey ?? getEnv().RESEND_API_KEY);
  }

  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    const logger = getLogger();
    const env = getEnv();

    const from = options.from ?? env.EMAIL_FROM_ADDRESS;
    const replyTo = options.replyTo ?? env.EMAIL_REPLY_TO ?? undefined;

    logger.debug(
      { to: options.to, subject: options.subject, from },
      'resend: sending email',
    );

    const { data, error } = await this.client.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: replyTo ? [replyTo] : undefined,
      tags: options.tags,
      headers: options.headers,
    });

    if (error) {
      logger.error(
        { err: error, to: options.to, subject: options.subject },
        'resend: send failed',
      );
      throw new Error(`Resend API error: ${error.message}`);
    }

    if (!data?.id) {
      logger.error(
        { to: options.to, subject: options.subject },
        'resend: no message ID returned',
      );
      throw new Error('Resend API returned no message ID');
    }

    logger.info(
      { messageId: data.id, to: options.to, subject: options.subject },
      'resend: email sent successfully',
    );

    return { id: data.id };
  }
}
