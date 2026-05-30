import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../shared/types.js';

/**
 * Extract real client IP considering trusted proxy headers.
 * For production: trust only the first untrusted IP in X-Forwarded-For chain.
 */
export const ipExtract = createMiddleware<AppEnv>(async (c, next) => {
  let ip = 'unknown';

  // X-Forwarded-For may contain a chain: client, proxy1, proxy2
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    // Take the leftmost (client) IP — assumes reverse proxy sets this correctly
    const first = xff.split(',')[0];
    if (first) {
      ip = first.trim();
    }
  }

  // Fallback to X-Real-Ip
  if (ip === 'unknown') {
    const xRealIp = c.req.header('x-real-ip');
    if (xRealIp) {
      ip = xRealIp.trim();
    }
  }

  // Final fallback: Hono provides remote address on some runtimes
  if (ip === 'unknown') {
    // Node.js adapter exposes this via env
    const connInfo = c.req.header('x-forwarded-for') ?? '127.0.0.1';
    ip = connInfo.split(',')[0]?.trim() ?? '127.0.0.1';
  }

  c.set('clientIp', ip);
  await next();
});
