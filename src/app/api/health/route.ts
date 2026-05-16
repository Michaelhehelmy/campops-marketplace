import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PluginBroker } from '@/lib/PluginBroker';
import { PluginRuntimeService } from '@/lib/PluginRuntimeService';
import { logger } from '@/lib/logger';

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {};

  // DB check
  try {
    await db.query('SELECT 1');
    checks.database = { status: 'ok' };
  } catch (err: any) {
    checks.database = { status: 'error', message: err.message };
  }

  // Plugin broker check
  try {
    await PluginRuntimeService.init();
    const plugins = PluginBroker.getLoadedPlugins();
    checks.plugins = { status: 'ok', message: `${plugins.length} loaded` };
  } catch (err: any) {
    checks.plugins = { status: 'error', message: err.message };
  }

  // Memory
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: 'ok',
    message: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks,
  });
}
