import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PluginBroker } from '@/lib/PluginBroker';
import { logger } from '@/lib/logger';
import { execSync } from 'child_process';
import fs from 'fs';
import { getPluginHealth, getPluginHealthSummary } from '@/lib/plugin-watchdog';

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, Record<string, unknown>> = {};

  const dbStart = Date.now();
  try {
    await db.query('SELECT 1');
    checks.database = { status: 'ok', duration: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'error', message: err.message };
  }

  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'sinaicamps.db';
    const stats = fs.statSync(dbPath);
    const diskUsage =
      process.platform === 'linux'
        ? execSync("df -k . | tail -1 | awk '{print $4}'").toString().trim()
        : 'N/A';
    const sizeMB = Math.round(stats.size / 1024 / 1024);
    checks.disk = {
      status: sizeMB > 1024 ? 'warning' : 'ok',
      message: `${sizeMB}MB used, ${diskUsage}KB free`,
    };
  } catch (err: any) {
    checks.disk = { status: 'warning', message: err.message };
  }

  const loadedPluginNames = PluginBroker.getLoadedPlugins();
  const pluginSummary = getPluginHealthSummary();
  const unhealthyPlugins = getPluginHealth().filter((r) => r.status !== 'healthy');
  checks.plugins = {
    status: pluginSummary.unhealthy > 0 ? 'warning' : 'ok',
    message: `${loadedPluginNames.length} loaded, ${pluginSummary.healthy} healthy, ${pluginSummary.unhealthy} unhealthy`,
    details: unhealthyPlugins.length > 0 ? unhealthyPlugins : undefined,
  };

  const memUsage = process.memoryUsage();
  const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
  checks.memory = {
    status: heapUsageRatio > 0.9 ? 'warning' : 'ok',
    message: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB (rss: ${Math.round(memUsage.rss / 1024 / 1024)}MB)`,
  };

  const hasErrors = Object.values(checks).some((c) => c.status === 'error');
  const statusCode = hasErrors ? 503 : 200;

  return NextResponse.json(
    {
      status: hasErrors ? 'degraded' : 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
