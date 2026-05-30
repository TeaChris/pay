import type { ErrorHandler } from 'hono';
import type { AppEnv } from '../shared/types.js';
import { AppError, RateLimitError } from '../shared/errors.js';
import { getLogger } from '../infrastructure/logging/logger.js';

/**
 * Global error handler. Returns structured JSON errors.
 * Never leaks stack traces or internal details in production.
 */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const logger = getLogger();
  const requestId = c.get('requestId');

  if (err instanceof RateLimitError) {
    c.header('Retry-After', String(err.retryAfterSec));
    logger.warn({ requestId, code: err.code }, err.message);
    return c.json(
      { success: false, error: { code: err.code, message: err.message } },
      429,
    );
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, code: err.code, err }, 'server error');
    } else {
      logger.warn({ requestId, code: err.code }, err.message);
    }

    return c.json(
      { success: false, error: { code: err.code, message: err.message } },
      err.statusCode as 400,
    );
  }

  // Unhandled / unexpected error
  logger.error({ requestId, err }, 'unhandled error');

  return c.json(
    {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    },
    500,
  );
};
