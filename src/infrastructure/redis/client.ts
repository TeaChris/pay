import { Redis } from 'ioredis';
import { getEnv } from '../../config/env.js';

let _redis: Redis | undefined;

export function createRedis(url?: string): Redis {
  const redisUrl = url ?? getEnv().REDIS_URL;
  const useTls = redisUrl.startsWith('rediss://');
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times: number): number | null {
      if (times > 10) return null; // stop retrying
      return Math.min(times * 200, 5_000);
    },
    tls: useTls ? {} : undefined,
  });

  return redis;
}

export function getRedis(): Redis {
  if (!_redis) {
    _redis = createRedis();
  }
  return _redis;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status === 'ready') return;
  await redis.connect();
}

export async function healthCheckRedis(): Promise<boolean> {
  try {
    const result = await getRedis().ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = undefined;
  }
}
