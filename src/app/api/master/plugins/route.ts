import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PluginDiscoveryService } from '@/lib/PluginDiscoveryService';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/plugins
 *
 * Returns all plugins with their status and property associations.
 * Requires authentication with master role.
 */
export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[Master Plugins API] Syncing plugins...');
      await PluginDiscoveryService.syncPlugins().catch((e) => console.error('Sync failed', e));
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    console.log('[Master Plugins API] Fetching plugins...');
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

    console.log('[Master Plugins API] Fetching total count...');
    let countResult = db.prepare('SELECT COUNT(*) as count FROM available_plugins').get();
    if (countResult instanceof Promise) countResult = await countResult;

    const total = countResult?.count || 0;

    console.log('[Master Plugins API] Fetching associations...');
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
      console.warn(
        '[Master Plugins API] Failed to fetch property associations, defaulting to empty.'
      );
    }

    const bookingAssoc = propertyAssociations.filter(
      (a: any) => (a.pluginName || a.plugin_name) === 'booking'
    );
    console.log(
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
    console.error('[Master Plugins API] Error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
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
    const body = await req.json();
    const { pluginId, propertyId, enabled } = body;

    console.log(
      `[Master Plugins API] Toggle: plugin=${pluginId}, property=${propertyId}, enabled=${enabled}`
    );

    if (!pluginId || !propertyId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'pluginId, propertyId, and enabled are required' },
        { status: 400 }
      );
    }

    if (propertyId === 'all') {
      console.log(`[Master Plugins API] Updating global status: ${pluginId} -> ${enabled}`);
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
        console.log(`[Master Plugins API] Updating existing association: ${existing.id}`);
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
        console.log(`[Master Plugins API] After update: ${JSON.stringify(verify)}`);
      } else if (enabled) {
        console.log(`[Master Plugins API] Creating new association`);
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
    console.error('[Master Plugins API] Error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
