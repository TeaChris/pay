import { randomUUID } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../shared/types.js';

/**
 * Generates a unique request ID and correlation ID for every request.
 * Correlation ID can be passed from upstream via X-Correlation-Id header.
 */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = randomUUID();
  const correlationId = c.req.header('x-correlation-id') ?? id;

  c.set('requestId', id);
  c.set('correlationId', correlationId);
  c.header('X-Request-Id', id);

  await next();
});
