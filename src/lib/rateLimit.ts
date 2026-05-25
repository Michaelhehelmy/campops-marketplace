import { RateLimitError } from './errors';
import { logger } from './logger';

interface WindowEntry {
  count: number;
  resetAt: number;
}

let redisClient: any = null;

if (typeof process !== 'undefined' && process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL);
    logger.info('Redis rate limiter client initialized successfully.');
  } catch (e: any) {
    logger.warn(
      'Failed to initialize Redis client for rate limiting. Falling back to in-memory.',
      e.message
    );
  }
}

export class RateLimiter {
  private windows = new Map<string, WindowEntry>();
  readonly maxRequests: number;
  private windowMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests = 100, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  startCleanup(intervalMs = 30_000): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => this.cleanup(), intervalMs);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  check(key: string): any {
    if (redisClient) {
      return this.checkRedis(key);
    }
    return this.checkMemory(key);
  }

  private checkMemory(key: string): { remaining: number; reset: number; limit: number } {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { remaining: this.maxRequests - 1, reset: resetAt, limit: this.maxRequests };
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      logger.warn(`Rate limit exceeded for ${key}: ${entry.count}/${this.maxRequests}`);
      throw new RateLimitError('Too many requests', retryAfter);
    }

    return {
      remaining: this.maxRequests - entry.count,
      reset: entry.resetAt,
      limit: this.maxRequests,
    };
  }

  private async checkRedis(
    key: string
  ): Promise<{ remaining: number; reset: number; limit: number }> {
    const now = Date.now();
    const redisKey = `rate_limit:${key}`;
    const windowStart = now - this.windowMs;

    try {
      const pipeline = redisClient.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zcard(redisKey);
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      pipeline.pexpire(redisKey, this.windowMs);

      const results = await pipeline.exec();
      const count = (results[1][1] as number) + 1;

      if (count > this.maxRequests) {
        const oldest = await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
        const oldestScore = oldest.length > 1 ? parseInt(oldest[1]) : now;
        const resetAt = oldestScore + this.windowMs;
        const retryAfter = Math.ceil((resetAt - now) / 1000);
        logger.warn(`Rate limit exceeded for ${key} via Redis: ${count}/${this.maxRequests}`);
        throw new RateLimitError('Too many requests', retryAfter);
      }

      const oldest = await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
      const oldestScore = oldest.length > 1 ? parseInt(oldest[1]) : now;
      const resetAt = oldestScore + this.windowMs;

      return {
        remaining: this.maxRequests - count,
        reset: resetAt,
        limit: this.maxRequests,
      };
    } catch (e: any) {
      if (e instanceof RateLimitError) throw e;
      logger.error('Redis rate limit check failed. Falling back to in-memory check.', e);
      return this.checkMemory(key);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (now >= entry.resetAt) {
        this.windows.delete(key);
      }
    }
  }

  reset(): void {
    this.windows.clear();
  }

  get size(): number {
    return this.windows.size;
  }
}

export const apiRateLimiter = new RateLimiter(100, 60_000);
apiRateLimiter.startCleanup();
