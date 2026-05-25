import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, set, del, flush, wrap, size } from '../cache';

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
});
