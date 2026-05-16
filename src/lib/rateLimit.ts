import { RateLimitError } from './errors';
import { logger } from './logger';

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding-window rate limiter.
 *
 * Tracks requests per key (typically IP address) within a configurable
 * window. Expired entries are cleaned up on each check.
 */
export class RateLimiter {
  private windows = new Map<string, WindowEntry>();
  private maxRequests: number;
  private windowMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests = 100, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Start periodic cleanup of expired entries.
   */
  startCleanup(intervalMs = 30_000): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => this.cleanup(), intervalMs);
  }

  /**
   * Stop periodic cleanup.
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check if a request is allowed for the given key.
   * Returns rate limit info. Throws RateLimitError if exceeded.
   */
  check(key: string): { remaining: number; reset: number; limit: number } {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now >= entry.resetAt) {
      // New window
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

  /**
   * Remove expired entries.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (now >= entry.resetAt) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.windows.clear();
  }

  /**
   * Get current entry count (for testing).
   */
  get size(): number {
    return this.windows.size;
  }
}

/**
 * Shared default instance for API routes.
 */
export const apiRateLimiter = new RateLimiter(100, 60_000);
apiRateLimiter.startCleanup();
