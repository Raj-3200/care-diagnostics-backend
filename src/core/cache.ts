/**
 * Redis cache utility.
 * Provides typed get/set/invalidate with automatic JSON serialization.
 * Gracefully degrades if Redis is unavailable.
 */

import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let redis: Redis | null = null;

export function initRedis(): Redis | null {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) {
    console.log('⚠️  REDIS_URL not set — caching disabled');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    });

    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err: Error) => console.error('Redis error:', err.message));

    void redis.connect().catch(() => {
      console.warn('⚠️  Redis connection failed — caching disabled');
      redis = null;
    });

    return redis;
  } catch {
    console.warn('⚠️  Redis initialization failed');
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Silently fail
  }
}

export async function cacheInvalidate(...patterns: string[]): Promise<void> {
  if (!redis) return;
  try {
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.del(pattern);
      }
    }
  } catch {
    // Silently fail
  }
}

export function getRedis(): Redis | null {
  return redis;
}
