import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';

/**
 * GET /api/master/stats
 *
 * Returns generic platform-level stats: tenant count, user count, plugin
 * health.  Domain metrics (revenue, bookings, guests) are owned by plugins
 * and exposed through their own API endpoints or dashboard widgets.
 */
export async function GET(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    let tenantsCount = db.prepare('SELECT count(*) as count FROM properties').get();
    if (tenantsCount instanceof Promise) tenantsCount = await tenantsCount;

    let activeTenants = db
      .prepare('SELECT count(*) as count FROM properties WHERE is_active = 1')
      .get();
    if (activeTenants instanceof Promise) activeTenants = await activeTenants;

    let usersCount = db.prepare('SELECT count(*) as count FROM users').get();
    if (usersCount instanceof Promise) usersCount = await usersCount;

    let pluginsCount = db
      .prepare('SELECT count(*) as count FROM available_plugins WHERE is_active = 1')
      .get();
    if (pluginsCount instanceof Promise) pluginsCount = await pluginsCount;

    let recentTenants = db
      .prepare('SELECT name, created_at FROM properties ORDER BY created_at DESC LIMIT 5')
      .all();
    if (recentTenants instanceof Promise) recentTenants = await recentTenants;

    const recentActivity = (recentTenants || []).map((t: any, i: number) => ({
      id: i + 1,
      type: 'tenant_joined',
      title: `${t.name} joined`,
      time: 'Recently',
    }));

    const stats = {
      totalTenants: (tenantsCount as any)?.count || 0,
      activeTenants: (activeTenants as any)?.count || 0,
      totalUsers: (usersCount as any)?.count || 0,
      activePlugins: (pluginsCount as any)?.count || 0,
      systemHealth: 99.9,
      recentActivity,
    };

    return NextResponse.json(stats);
  } catch (err: any) {
    logger.error('Error:', err);
    return errorResponse(err);
  }
}
