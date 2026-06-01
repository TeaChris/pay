import { cors } from 'hono/cors';
import { getEnv } from '../config/env.js';

/**
 * CORS middleware with strict origin allowlist and credentials support.
 */
export function createCorsMiddleware() {
  const env = getEnv();
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());

  return cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) return origin;
      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposeHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    maxAge: 86400,
  });
}
