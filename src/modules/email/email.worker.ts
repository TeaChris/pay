/**
 * BullMQ email worker — processes queued email jobs.
 *
 * Responsibilities:
 *   - Template resolution and rendering
 *   - Idempotency enforcement via Redis
 *   - Structured logging (queued / sent / failed / retries)
 *   - Dead letter preservation on final failure
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { getRedis } from '../../infrastructure/redis/client.js';
import { getLogger } from '../../infrastructure/logging/logger.js';
import { getEmailProvider } from '../../infrastructure/email/index.js';
import { renderTemplate } from './templates/index.js';
import { EMAIL_QUEUE_NAME } from './email.queue.js';
import type { EmailJobData } from './email.types.js';

/** Idempotency keys expire after 48h to prevent indefinite growth. */
const IDEMPOTENCY_TTL_SEC = 172_800;

let _worker: Worker<EmailJobData> | undefined;

/**
 * Start the email worker.
 * Should be called once during application startup, after Redis is connected.
 */
export function startEmailWorker(): Worker<EmailJobData> {
  if (_worker) return _worker;

  const logger = getLogger();

  _worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { data } = job;
      const logContext = {
        jobId: job.id,
        emailType: data.type,
        category: data.category,
        to: data.to,
        correlationId: data.correlationId,
        attempt: job.attemptsMade + 1,
        idempotencyKey: data.idempotencyKey,
      };

      logger.info(logContext, 'email worker: processing job');

      // ─── Idempotency Check ──────────────────────────────────
      const redis = getRedis();
      const idempotencyKey = `email:idempotency:${data.idempotencyKey}`;
      const alreadySent = await redis.get(idempotencyKey);

      if (alreadySent) {
        logger.info(
          { ...logContext, previousMessageId: alreadySent },
          'email worker: skipping duplicate (idempotency hit)',
        );
        return;
      }

      // ─── Render Template ────────────────────────────────────
      const rendered = renderTemplate(data.type, data.data);

      // ─── Send via Provider ──────────────────────────────────
      const provider = getEmailProvider();
      const result = await provider.sendEmail({
        to: data.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: [
          { name: 'category', value: data.category },
          { name: 'type', value: data.type },
        ],
      });

      // ─── Mark as Sent (Idempotency) ─────────────────────────
      await redis.set(idempotencyKey, result.id, 'EX', IDEMPOTENCY_TTL_SEC);

      logger.info(
        { ...logContext, messageId: result.id },
        'email worker: email sent successfully',
      );
    },
    {
      connection: getRedis().duplicate({ maxRetriesPerRequest: null }),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1_000, // 10 emails/sec — Resend rate limit safe
      },
    },
  );

  // ─── Worker Event Logging ─────────────────────────────────────

  _worker.on('completed', (job) => {
    logger.debug(
      { jobId: job.id, emailType: job.data.type, to: job.data.to },
      'email worker: job completed',
    );
  });

  _worker.on('failed', (job, err) => {
    const isFinalAttempt = job ? job.attemptsMade >= (job.opts.attempts ?? 5) : false;
    const level = isFinalAttempt ? 'error' : 'warn';

    logger[level](
      {
        jobId: job?.id,
        emailType: job?.data.type,
        to: job?.data.to,
        correlationId: job?.data.correlationId,
        attempt: job?.attemptsMade,
        maxAttempts: job?.opts.attempts,
        err,
        deadLetter: isFinalAttempt,
      },
      isFinalAttempt
        ? 'email worker: job moved to dead letter (all retries exhausted)'
        : 'email worker: job failed, will retry',
    );
  });

  _worker.on('error', (err) => {
    logger.error({ err, queue: EMAIL_QUEUE_NAME }, 'email worker: error');
  });

  logger.info({ queue: EMAIL_QUEUE_NAME, concurrency: 5 }, 'email worker started');

  return _worker;
}

/**
 * Gracefully shutdown the email worker.
 */
export async function closeEmailWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = undefined;
  }
}
