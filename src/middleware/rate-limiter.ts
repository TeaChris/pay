import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../shared/types.js';
import type { RateLimitConfig } from '../config/constants.js';
import { RateLimitError } from '../shared/errors.js';
import { getRedis } from '../infrastructure/redis/client.js';
import { RedisKeys } from '../infrastructure/redis/keys.js';
import { randomUUID } from 'node:crypto';

/**
 * Lua script for atomic sliding window rate limiting.
 * Uses sorted sets with timestamp scores.
 */
const SLIDING_WINDOW_LUA = `
  local key = KEYS[1]
  local window = tonumber(ARGV[1])
  local maxReqs = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  local reqId = ARGV[4]

  redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
  local count = redis.call('ZCARD', key)

  if count < maxReqs then
    redis.call('ZADD', key, now, reqId)
    redis.call('PEXPIRE', key, window)
    return {1, count + 1}
  else
    return {0, count}
  end
`;

export type KeyExtractor = (c: Parameters<Parameters<typeof createMiddleware<AppEnv>>[0]>[0]) => string;

/**
 * Factory for Redis-backed sliding window rate limiter middleware.
 *
 * @param config - Rate limit window (ms) and max requests
 * @param scope - Namespace for the rate limit key (e.g., 'login', 'register')
 * @param keyExtractor - Function to derive the rate limit key from request context
 */
export function rateLimiter(
  config: RateLimitConfig,
  scope: string,
  keyExtractor?: KeyExtractor,
) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const identifier = keyExtractor ? keyExtractor(c) : c.get('clientIp');
    const key = RedisKeys.rateLimit(scope, identifier);
    const now = Date.now();
    const reqId = `${now}:${randomUUID()}`;

    const redis = getRedis();
    const result = (await redis.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      config.window,
      config.max,
      now,
      reqId,
    )) as [number, number];

    const [allowed, count] = result;
    const remaining = Math.max(0, config.max - count);

    c.header('X-RateLimit-Limit', String(config.max));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (allowed === 0) {
      const retryAfterSec = Math.ceil(config.window / 1000);
      c.header('Retry-After', String(retryAfterSec));
      throw new RateLimitError(retryAfterSec);
    }

    await next();
  });
}
