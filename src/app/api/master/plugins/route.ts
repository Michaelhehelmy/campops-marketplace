import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PluginDiscoveryService } from '@/lib/PluginDiscoveryService';
import { AuditService } from '@/lib/audit';
import fs from 'fs';
import path from 'path';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const pluginToggleSchema = z.object({
  pluginId: z.string().min(1),
  propertyId: z.string().min(1),
  enabled: z.boolean(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/plugins
 *
 * Returns all plugins with their status and property associations.
 * Requires authentication with master role.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    if (process.env.NODE_ENV !== 'test') {
      logger.info('[Master Plugins API] Syncing plugins...');
      await PluginDiscoveryService.syncPlugins().catch((e) => logger.error('Sync failed', e));
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    logger.info('[Master Plugins API] Fetching plugins...');
    let rawPlugins = db
      .prepare(
        'SELECT id, name, display_name, category, is_official, is_active, manifest FROM available_plugins ORDER BY category, name LIMIT ? OFFSET ?'
      )
      .all(limit, skip);
    if (rawPlugins instanceof Promise) rawPlugins = await rawPlugins;

    const plugins = ((rawPlugins || []) as any[]).map((p) => ({
      ...p,
      isActive: !!p.is_active,
      isOfficial: !!p.is_official,
      displayName: p.display_name,
    }));

    logger.info('[Master Plugins API] Fetching total count...');
    let countResult = db.prepare('SELECT COUNT(*) as count FROM available_plugins').get();
    if (countResult instanceof Promise) countResult = await countResult;

    const total = countResult?.count || 0;

    logger.info('[Master Plugins API] Fetching associations...');
    let propertyAssociations: any[] = [];
    try {
      let propertyAssociationsRaw = db
        .prepare(
          'SELECT property_id as propertyId, plugin_name as pluginName, is_enabled as isEnabled FROM property_plugins'
        )
        .all();
      if (propertyAssociationsRaw instanceof Promise)
        propertyAssociationsRaw = await propertyAssociationsRaw;
      propertyAssociations = (propertyAssociationsRaw || []) as any[];
    } catch (e) {
      logger.warn(
        '[Master Plugins API] Failed to fetch property associations, defaulting to empty.'
      );
    }

    const bookingAssoc = propertyAssociations.filter(
      (a: any) => (a.pluginName || a.plugin_name) === 'booking'
    );
    logger.info(
      `[Master Plugins API] Success: ${plugins.length} plugins, ${total} total, ${propertyAssociations.length} associations. Booking: ${JSON.stringify(bookingAssoc)}`
    );
    return NextResponse.json({
      plugins,
      total,
      propertyAssociations,
    });
  } catch (err: any) {
    try {
      fs.appendFileSync(
        path.join(process.cwd(), 'error.log'),
        `[GET] Error: ${err.message}\nStack: ${err.stack}\n`
      );
    } catch (e) {}
    logger.error('[Master Plugins API] Error:', err);
    return errorResponse(err);
  }
}

/**
 * POST /api/master/plugins
 *
 * Toggles a plugin for a specific property.
 * Requires authentication with master role.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const parsed = pluginToggleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const { pluginId, propertyId, enabled } = body;

    logger.info(
      `[Master Plugins API] Toggle: plugin=${pluginId}, property=${propertyId}, enabled=${enabled}`
    );

    if (!pluginId || !propertyId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'pluginId, propertyId, and enabled are required' },
        { status: 400 }
      );
    }

    if (propertyId === 'all') {
      logger.info(`[Master Plugins API] Updating global status: ${pluginId} -> ${enabled}`);
      await db
        .prepare('UPDATE available_plugins SET is_active = ? WHERE name = ?')
        .run(enabled ? 1 : 0, pluginId);
      // Also update all existing property-level entries to match global state
      await db
        .prepare('UPDATE property_plugins SET is_enabled = ? WHERE plugin_name = ?')
        .run(enabled ? 1 : 0, pluginId);
    } else {
      // Check if the plugin-property association exists
      const existing = await db
        .prepare(
          `
        SELECT id
        FROM property_plugins
        WHERE plugin_name = ? AND property_id = ?
      `
        )
        .get(pluginId, propertyId);

      if (existing) {
        logger.info(`[Master Plugins API] Updating existing association: ${existing.id}`);
        // Update existing
        await db
          .prepare(
            `
          UPDATE property_plugins
          SET is_enabled = ?
          WHERE plugin_name = ? AND property_id = ?
        `
          )
          .run(enabled ? 1 : 0, pluginId, propertyId);
        const verify = await db
          .prepare(
            `SELECT is_enabled FROM property_plugins WHERE plugin_name = ? AND property_id = ?`
          )
          .get(pluginId, propertyId);
        logger.info(`[Master Plugins API] After update: ${JSON.stringify(verify)}`);
      } else if (enabled) {
        logger.info(`[Master Plugins API] Creating new association`);
        // Create new
        await db
          .prepare(
            `
          INSERT INTO property_plugins (id, plugin_name, property_id, is_enabled, created_at)
          VALUES (?, ?, ?, 1, datetime('now'))
        `
          )
          .run(crypto.randomUUID(), pluginId, propertyId);
      }
    }

    AuditService.log({
      userId: session.user?.id || 'unknown',
      action: enabled ? 'plugin_activated' : 'plugin_deactivated',
      resource: 'plugin',
      resourceId: pluginId,
      details: { pluginId, propertyId, enabled },
      propertyId: propertyId !== 'all' ? propertyId : undefined,
    });

    return NextResponse.json({
      ok: true,
      pluginId,
      propertyId,
      enabled,
    });
  } catch (err: any) {
    try {
      fs.appendFileSync(
        path.join(process.cwd(), 'error.log'),
        `[POST] Error: ${err.message}\nStack: ${err.stack}\n`
      );
    } catch (e) {}
    logger.error('[Master Plugins API] Error:', err);
    return errorResponse(err);
  }
}
