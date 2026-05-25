import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('connect', () => logger.info('Redis connected'));
  }
  return redisClient;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const c = getRedisClient();
  if (!c) return null;
  try {
    const v = await c.get(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch (e) {
    logger.error(`Redis GET ${key}:`, e);
    return null;
  }
}

export async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const c = getRedisClient();
  if (!c) return;
  try {
    await c.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (e) {
    logger.error(`Redis SET ${key}:`, e);
  }
}

export async function redisDelete(key: string): Promise<void> {
  const c = getRedisClient();
  if (!c) return;
  try {
    await c.del(key);
  } catch (e) {
    logger.error(`Redis DEL ${key}:`, e);
  }
}

export async function redisDeletePattern(pattern: string): Promise<number> {
  const c = getRedisClient();
  if (!c) return 0;
  try {
    const keys = await c.keys(pattern);
    if (!keys.length) return 0;
    await c.del(...keys);
    return keys.length;
  } catch (e) {
    logger.error(`Redis pattern delete ${pattern}:`, e);
    return 0;
  }
}

export async function redisHealthCheck(): Promise<{ status: string; latency: number }> {
  const c = getRedisClient();
  if (!c) return { status: 'not_configured', latency: 0 };
  const start = Date.now();
  try {
    await c.ping();
    return { status: 'healthy', latency: Date.now() - start };
  } catch {
    return { status: 'unhealthy', latency: Date.now() - start };
  }
}
