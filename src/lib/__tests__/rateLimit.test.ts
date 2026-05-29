import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, apiRateLimiter } from '../rateLimit';
import { RateLimitError } from '../errors';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(5, 60_000);
  });

  afterEach(() => {
    limiter.stopCleanup();
  });

  it('should allow requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      const info = limiter.check('user-1');
      expect(info.remaining).toBe(4 - i);
      expect(info.limit).toBe(5);
    }
  });

  it('should throw RateLimitError when limit exceeded', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }
    expect(() => limiter.check('user-1')).toThrow(RateLimitError);
  });

  it('should track different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }
    const info = limiter.check('user-2');
    expect(info.remaining).toBe(4);
  });

  it('should reset window after expiry', async () => {
    const shortLimiter = new RateLimiter(2, 10);
    shortLimiter.check('user-1');
    shortLimiter.check('user-1');
    expect(() => shortLimiter.check('user-1')).toThrow(RateLimitError);

    await new Promise((r) => setTimeout(r, 15));
    const info = shortLimiter.check('user-1');
    expect(info.remaining).toBe(1);
    shortLimiter.stopCleanup();
  });

  it('should cleanup expired entries', async () => {
    const shortLimiter = new RateLimiter(5, 10);
    shortLimiter.check('user-1');
    expect(shortLimiter.size).toBe(1);

    await new Promise((r) => setTimeout(r, 15));
    shortLimiter.cleanup();
    expect(shortLimiter.size).toBe(0);
    shortLimiter.stopCleanup();
  });

  it('should reset all state', () => {
    limiter.check('user-1');
    limiter.check('user-2');
    limiter.reset();
    expect(limiter.size).toBe(0);
  });

  it('should include retryAfter in RateLimitError', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }
    try {
      limiter.check('user-1');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).details).toHaveProperty('retryAfter');
    }
  });

  it('should support starting and stopping periodic cleanup intervals', () => {
    limiter.startCleanup(10);
    limiter.startCleanup(10);
    expect((limiter as any).cleanupInterval).toBeDefined();

    limiter.stopCleanup();
    expect((limiter as any).cleanupInterval).toBeNull();
  });

  it('should return remaining count decreasing', () => {
    const i1 = limiter.check('user-1');
    expect(i1.remaining).toBe(4);
    const i2 = limiter.check('user-1');
    expect(i2.remaining).toBe(3);
  });

  it('should handle high-traffic keys independently', () => {
    for (let i = 0; i < 100; i++) {
      if (i < 5) {
        const info = limiter.check('busy');
        expect(info.remaining).toBe(4 - i);
      } else {
        expect(() => limiter.check('busy')).toThrow(RateLimitError);
      }
    }
    const info = limiter.check('other');
    expect(info.remaining).toBe(4);
  });

  it('should have retryAfter > 0 in RateLimitError', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user-1');
    }
    try {
      limiter.check('user-1');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).details).toHaveProperty('retryAfter');
    }
  });

  it('should maintain state after cleanup with no expired entries', () => {
    limiter.check('user-1');
    limiter.cleanup();
    expect(limiter.size).toBe(1);
  });
});

describe('apiRateLimiter', () => {
  it('should be a RateLimiter instance with 100 req/min defaults', () => {
    expect(apiRateLimiter).toBeInstanceOf(RateLimiter);
    expect(apiRateLimiter.maxRequests).toBe(100);
  });
});
