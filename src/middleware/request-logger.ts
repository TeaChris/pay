import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../shared/types.js';
import { getLogger } from '../infrastructure/logging/logger.js';

/**
 * Structured request logging with latency tracking.
 * Logs at info/warn/error based on status code.
 */
export const requestLogger = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  const logger = getLogger();

  await next();

  const latencyMs = Math.round(performance.now() - start);
  const status = c.res.status;
  const logData = {
    method: c.req.method,
    path: c.req.path,
    status,
    latencyMs,
    requestId: c.get('requestId'),
    clientIp: c.get('clientIp'),
  };

  if (status >= 500) {
    logger.error(logData, 'request completed with server error');
  } else if (status >= 400) {
    logger.warn(logData, 'request completed with client error');
  } else {
    logger.info(logData, 'request completed');
  }
});
