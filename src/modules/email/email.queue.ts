/**
 * BullMQ email queue setup.
 * Follows the project's singleton getter pattern (getDb, getRedis, getLogger).
 */

import { Queue } from 'bullmq';
import { getRedis } from '../../infrastructure/redis/client.js';
import { getLogger } from '../../infrastructure/logging/logger.js';
import type { EmailJobData } from './email.types.js';

export const EMAIL_QUEUE_NAME = 'email';

let _queue: Queue<EmailJobData> | undefined;

/**
 * Get the singleton email queue instance.
 * Reuses the existing ioredis connection via getRedis().
 */
export function getEmailQueue(): Queue<EmailJobData> {
  if (!_queue) {
    _queue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
      connection: getRedis().duplicate(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2_000, // 2s, 4s, 8s, 16s, 32s
        },
        removeOnComplete: {
          age: 86_400, // Keep completed jobs for 24h for observability
          count: 1_000,
        },
        removeOnFail: false, // Retain failed jobs for dead-letter inspection
      },
    });

    const logger = getLogger();
    _queue.on('error', (err) => {
      logger.error({ err, queue: EMAIL_QUEUE_NAME }, 'email queue error');
    });
  }

  return _queue;
}

/**
 * Close the email queue gracefully.
 */
export async function closeEmailQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = undefined;
  }
}
