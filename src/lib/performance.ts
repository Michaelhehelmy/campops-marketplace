import { logger } from './logger';

export interface TimingResult {
  label: string;
  durationMs: number;
  timestamp: number;
}

const SLOW_THRESHOLD_MS = 500;

export function time<T>(label: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const durationMs = performance.now() - start;
    if (durationMs > SLOW_THRESHOLD_MS) {
      logger.warn(`[PERF] ${label} took ${durationMs.toFixed(1)}ms (slow)`);
    }
  }
}

export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - start;
    if (durationMs > SLOW_THRESHOLD_MS) {
      logger.warn(`[PERF] ${label} took ${durationMs.toFixed(1)}ms (slow)`);
    }
  }
}

export function createQueryLogger(db: { prepare: (sql: string) => { all: () => unknown[]; get: () => unknown; run: () => void } }, slowThresholdMs = 200) {
  const original = {
    prepare: db.prepare.bind(db),
  };

  db.prepare = ((sql: string) => {
    const stmt = original.prepare(sql);
    const wrapped = ['all', 'get', 'run'].reduce((acc, method) => {
      const originalMethod = (stmt as any)[method].bind(stmt);
      (acc as any)[method] = (...args: unknown[]) => {
        const start = performance.now();
        try {
          return (originalMethod as (...a: unknown[]) => unknown)(...args);
        } finally {
          const duration = performance.now() - start;
          if (duration > slowThresholdMs) {
            logger.warn(`[SLOW_QUERY] ${duration.toFixed(1)}ms — ${sql.slice(0, 120)}`);
          }
        }
      };
      return acc;
    }, {} as Record<string, unknown>);
    return { ...stmt, ...wrapped };
  }) as typeof db.prepare;

  return db;
}
