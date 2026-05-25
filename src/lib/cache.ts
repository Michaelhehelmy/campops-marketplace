import { logger } from './logger';
import { redisGet, redisSet, redisDelete, redisDeletePattern, getRedisClient, redisHealthCheck } from './redis-cache';

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000;
const SWEEP_INTERVAL_MS = 120_000;

let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startSweep(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  if (typeof sweepTimer === 'object' && typeof sweepTimer.unref === 'function') {
    sweepTimer.unref();
  }
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  startSweep();
}

export function del(key: string): void {
  store.delete(key);
}

export function flush(): void {
  store.clear();
}

export function wrap<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const cached = get<T>(key);
  if (cached !== undefined) return Promise.resolve(cached);
  return fetchFn().then((value) => {
    set(key, value, ttlMs);
    return value;
  });
}

export function size(): number {
  return store.size;
}

const useRedis = !!process.env.REDIS_URL;

export async function cachedQuery<T>(
  key: string,
  options: { ttl: number; useRedis?: boolean; tags?: string[] },
  fn: () => Promise<T>
): Promise<T> {
  const { ttl, useRedis: forceRedis = false, tags = [] } = options;

  if (useRedis && (forceRedis || ttl > 60)) {
    const cached = await redisGet<T>(key);
    if (cached !== null) {
      logger.debug(`Redis cache hit: ${key}`);
      return cached;
    }
  }

  const localCached = get<T>(key);
  if (localCached !== undefined) {
    logger.debug(`Local cache hit: ${key}`);
    return localCached;
  }

  logger.debug(`Cache miss: ${key}`);
  const result = await fn();

  if (useRedis && (forceRedis || ttl > 60)) {
    await redisSet(key, result, ttl);
  }
  set(key, result, ttl * 1000);

  if (tags.length > 0) {
    for (const tag of tags) {
      const tagKey = `_tag:${tag}`;
      const existing = store.get(tagKey);
      const keys: string[] = existing ? (existing.value as string[]) : [];
      if (!keys.includes(key)) {
        store.set(tagKey, { value: [...keys, key], expiresAt: Date.now() + ttl * 2000 });
      }
    }
  }

  return result;
}

export async function invalidateCache(pattern?: string, tags?: string[]): Promise<void> {
  if (pattern) {
    if (useRedis) await redisDeletePattern(pattern);
    const localKeys = Array.from(store.keys()).filter((k) => k.includes(pattern!));
    localKeys.forEach((k) => store.delete(k));
    logger.info(`Invalidated cache pattern: ${pattern} (${localKeys.length} local keys)`);
  }

  if (tags) {
    for (const tag of tags) {
      const tagKey = `_tag:${tag}`;
      const entry = store.get(tagKey);
      const keys: string[] = entry ? (entry.value as string[]) : [];
      if (useRedis) {
        for (const key of keys) await redisDelete(key);
      }
      keys.forEach((k) => store.delete(k));
      store.delete(tagKey);
      logger.info(`Invalidated tag ${tag}: ${keys.length} keys`);
    }
  }
}

export function getCacheStats() {
  return {
    local: { keys: store.size },
    redis: { available: useRedis },
  };
}

export async function cacheHealthCheck() {
  const redisHealth = await redisHealthCheck();
  return {
    local: { status: 'healthy', keys: store.size, hits: 0, misses: 0, hitRate: 0 },
    redis: redisHealth,
  };
}

export async function flushAll(): Promise<void> {
  flush();
  if (useRedis) {
    const client = getRedisClient();
    if (client) await client.flushdb();
  }
}
