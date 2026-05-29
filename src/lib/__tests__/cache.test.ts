import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set, del, flush, wrap, size, cachedQuery, invalidateCache, getCacheStats, cacheHealthCheck, flushAll } from '../cache';

vi.mock('../redis-cache', () => ({
  redisGet: vi.fn().mockResolvedValue(null),
  redisSet: vi.fn().mockResolvedValue(undefined),
  redisDelete: vi.fn().mockResolvedValue(undefined),
  redisDeletePattern: vi.fn().mockResolvedValue(0),
  getRedisClient: vi.fn().mockReturnValue(null),
  redisHealthCheck: vi.fn().mockResolvedValue({ status: 'not_configured', latency: 0 }),
}));

describe('cache', () => {
  beforeEach(() => {
    flush();
  });

  it('set and get a value', () => {
    set('foo', { bar: 42 });
    expect(get('foo')).toEqual({ bar: 42 });
  });

  it('returns undefined for missing key', () => {
    expect(get('nope')).toBeUndefined();
  });

  it('expires after TTL', () => {
    set('brief', 'value', -1);
    expect(get('brief')).toBeUndefined();
  });

  it('del removes a key', () => {
    set('x', 1);
    del('x');
    expect(get('x')).toBeUndefined();
  });

  it('flush clears everything', () => {
    set('a', 1);
    set('b', 2);
    flush();
    expect(size()).toBe(0);
  });

  it('wrap caches a resolved promise', async () => {
    const fetchFn = vi.fn().mockResolvedValue('computed');
    const result1 = await wrap('key1', fetchFn);
    const result2 = await wrap('key1', fetchFn);
    expect(result1).toBe('computed');
    expect(result2).toBe('computed');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('wrap re-fetches after expiry', async () => {
    const fetchFn = vi.fn().mockResolvedValue('fresh');
    await wrap('key2', fetchFn, -1);
    await wrap('key2', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  describe('cachedQuery', () => {
    it('fetches from local cache on second call', async () => {
      const fn = vi.fn().mockResolvedValue('computed');
      const result1 = await cachedQuery('cq-1', { ttl: 30 }, fn);
      const result2 = await cachedQuery('cq-1', { ttl: 30 }, fn);
      expect(result1).toBe('computed');
      expect(result2).toBe('computed');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls fn on cache miss', async () => {
      const fn = vi.fn().mockResolvedValue('fresh');
      const result = await cachedQuery('cq-2', { ttl: 30 }, fn);
      expect(result).toBe('fresh');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('stores tags when provided', async () => {
      const fn = vi.fn().mockResolvedValue('tagged');
      await cachedQuery('cq-tag', { ttl: 30, tags: ['listings'] }, fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateCache', () => {
    it('invalidates by pattern', async () => {
      set('foo:1', 'a');
      set('foo:2', 'b');
      set('bar:1', 'c');
      await invalidateCache('foo');
      expect(get('foo:1')).toBeUndefined();
      expect(get('foo:2')).toBeUndefined();
      expect(get('bar:1')).toBe('c');
    });

    it('handles empty pattern gracefully', async () => {
      await expect(invalidateCache()).resolves.toBeUndefined();
    });

    it('invalidates by tags', async () => {
      set('tagged-key', 'val');
      set('_tag:mygroup', ['tagged-key']);
      await invalidateCache(undefined, ['mygroup']);
      expect(get('tagged-key')).toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('returns stats object', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('local');
      expect(stats.local).toHaveProperty('keys');
      expect(stats).toHaveProperty('redis');
    });
  });

  describe('cacheHealthCheck', () => {
    it('returns health status', async () => {
      const health = await cacheHealthCheck();
      expect(health.local.status).toBe('healthy');
      expect(health.redis).toBeDefined();
    });
  });

  describe('flushAll', () => {
    it('clears local store', async () => {
      set('x', 1);
      expect(size()).toBe(1);
      await flushAll();
      expect(size()).toBe(0);
    });
  });
});
