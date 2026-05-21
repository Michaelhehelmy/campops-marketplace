import { logger } from './logger';
import { PluginBroker } from './PluginBroker';

interface PluginHealthRecord {
  pluginId: string;
  propertyId: string | null;
  status: 'healthy' | 'unhealthy' | 'timed_out';
  loadedAt: number;
  lastPingAt: number;
  error?: string;
}

const RECORDS = new Map<string, PluginHealthRecord>();
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function cacheKey(pluginId: string, propertyId?: string | null): string {
  return `${pluginId}:${propertyId ?? 'system'}`;
}

export function recordLoad(pluginId: string, propertyId?: string | null): void {
  const key = cacheKey(pluginId, propertyId);
  RECORDS.set(key, {
    pluginId,
    propertyId: propertyId ?? null,
    status: 'healthy',
    loadedAt: Date.now(),
    lastPingAt: Date.now(),
  });
}

export function recordError(pluginId: string, error: string, propertyId?: string | null): void {
  const key = cacheKey(pluginId, propertyId);
  const existing = RECORDS.get(key);
  if (existing) {
    existing.status = 'unhealthy';
    existing.error = error;
  } else {
    RECORDS.set(key, {
      pluginId,
      propertyId: propertyId ?? null,
      status: 'unhealthy',
      loadedAt: Date.now(),
      lastPingAt: Date.now(),
      error,
    });
  }
}

export function removeRecord(pluginId: string, propertyId?: string | null): void {
  RECORDS.delete(cacheKey(pluginId, propertyId));
}

export function getPluginHealth(): PluginHealthRecord[] {
  return Array.from(RECORDS.values());
}

export function getPluginHealthSummary(): { total: number; healthy: number; unhealthy: number } {
  const records = Array.from(RECORDS.values());
  return {
    total: records.length,
    healthy: records.filter((r) => r.status === 'healthy').length,
    unhealthy: records.filter((r) => r.status !== 'healthy').length,
  };
}

const CHECK_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 10_000;

async function checkPlugin(key: string, record: PluginHealthRecord): Promise<void> {
  const publicApi = PluginBroker.get(record.pluginId);
  if (!publicApi || typeof publicApi !== 'object') {
    record.status = 'unhealthy';
    record.error = 'Not registered in broker';
    return;
  }

  const pingFn = (publicApi as any).__ping;
  if (typeof pingFn !== 'function') {
    record.lastPingAt = Date.now();
    return;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ping timed out')), PING_TIMEOUT_MS)
    );
    await Promise.race([pingFn(), timeoutPromise]);
    record.status = 'healthy';
    record.error = undefined;
    record.lastPingAt = Date.now();
  } catch (err: any) {
    record.status = 'timed_out';
    record.error = err.message;
  }
}

async function runCheck(): Promise<void> {
  for (const [key, record] of RECORDS.entries()) {
    try {
      await checkPlugin(key, record);
    } catch (err: any) {
      record.status = 'unhealthy';
      record.error = err.message;
    }
  }

  const summary = getPluginHealthSummary();
  if (summary.unhealthy > 0) {
    logger.warn(
      `[Watchdog] Plugin health check: ${summary.healthy}/${summary.total} healthy, ${summary.unhealthy} unhealthy`
    );
  }
}

export function startWatchdog(): void {
  if (intervalHandle !== null) return;
  logger.info('[Watchdog] Starting plugin watchdog (interval: 30s)');
  intervalHandle = setInterval(runCheck, CHECK_INTERVAL_MS);
  runCheck().catch((err) => logger.error('[Watchdog] Initial check failed:', err));
}

export function stopWatchdog(): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('[Watchdog] Stopped');
  }
}

export function clearRecords(): void {
  RECORDS.clear();
}
