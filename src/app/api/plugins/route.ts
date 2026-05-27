import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { logger } from '@/lib/logger';

// GET /api/plugins - Get active plugins with full manifests for a property
export async function GET(req: NextRequest) {
  const propertyId = req.headers.get('X-Property-Id') || req.nextUrl.searchParams.get('propertyId');

  if (!propertyId) {
    return NextResponse.json(
      { error: 'X-Property-Id header or propertyId query param required' },
      { status: 400 }
    );
  }

  try {
    // Get active plugins with full manifest data
    const plugins = await db
      .prepare(
        `
      SELECT 
        pp.plugin_name,
        pp.config,
        pp.installed_version,
        pp.installed_at,
        pp.feature_flags,
        ap.display_name,
        ap.description,
        ap.version as latest_version,
        ap.manifest,
        ap.entry_point_url,
        ap.css_url,
        ap.config_schema,
        ap.category,
        ap.icon_url,
        ap.is_premium,
        ap.price_cents,
        ap.required_roles,
        ap.dependencies
      FROM property_plugins pp
      JOIN available_plugins ap ON ap.name = pp.plugin_name
      WHERE pp.property_id = $1 
        AND pp.is_enabled = true 
        AND ap.is_active = true
      ORDER BY ap.display_name
    `
      )
      .all(propertyId);

    // Get assets for each plugin
    const pluginsWithAssets = await Promise.all(
      plugins.map(async (plugin: any) => {
        const assets = await db
          .prepare(
            `
          SELECT 
            asset_type,
            asset_url,
            target_location,
            load_order,
            cache_duration_seconds
          FROM plugin_assets
          WHERE plugin_name = $1 AND is_active = true
          ORDER BY load_order
        `
          )
          .all(plugin.plugin_name);

        return {
          ...plugin,
          assets: assets || [],
        };
      })
    );

    return NextResponse.json({
      plugins: pluginsWithAssets,
      count: pluginsWithAssets.length,
    });
  } catch (err: any) {
    logger.error('[Plugins API] Error:', err);
    return errorResponse(err);
  }
}

// POST /api/plugins - Enable a plugin for a property
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, userId, pluginName, config = {}, autoUpdate = true } = body;

    if (!propertyId || !userId || !pluginName) {
      return NextResponse.json(
        {
          error: 'propertyId, userId, and pluginName are required',
        },
        { status: 400 }
      );
    }

    // Verify plugin exists in marketplace
    const plugin = await db
      .prepare(
        `
      SELECT * FROM available_plugins WHERE name = $1 AND is_active = true
    `
      )
      .get(pluginName);

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found or not available' }, { status: 404 });
    }

    // Check if already enabled
    const existing = await db
      .prepare(
        `
      SELECT * FROM property_plugins WHERE property_id = $1 AND plugin_name = $2
    `
      )
      .get(propertyId, pluginName);

    if (existing) {
      // Update to enable
      await db
        .prepare(
          `
        UPDATE property_plugins 
        SET is_enabled = true, 
            config = $1,
            last_enabled_at = CURRENT_TIMESTAMP,
            auto_update = $2
        WHERE property_id = $3 AND plugin_name = $4
      `
        )
        .run(JSON.stringify(config), autoUpdate, propertyId, pluginName);
    } else {
      // Create new plugin entry
      await db
        .prepare(
          `
        INSERT INTO property_plugins 
        (property_id, plugin_name, is_enabled, config, installed_version, auto_update, installed_by, installed_at, last_enabled_at)
        VALUES ($1, $2, true, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
        )
        .run(propertyId, pluginName, JSON.stringify(config), plugin.version, autoUpdate, userId);
    }

    // Log analytics event
    await db
      .prepare(
        `
      INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
      VALUES ($1, $2, $3, $4)
    `
      )
      .run(
        pluginName,
        propertyId,
        'enable',
        JSON.stringify({
          enabled_by: userId,
          config,
          version: plugin.version,
        })
      );

    AuditService.log({
      userId,
      action: 'plugin.enable',
      resource: 'plugin',
      resourceId: pluginName,
      propertyId,
      details: { config, version: plugin.version },
    });

    return NextResponse.json({
      success: true,
      plugin: {
        plugin_name: pluginName,
        display_name: plugin.display_name,
        config,
        installed_version: plugin.version,
      },
      message: 'Plugin enabled successfully',
    });
  } catch (err: any) {
    logger.error('[Plugins Enable API] Error:', err);
    return errorResponse(err);
  }
}

// PUT /api/plugins - Update plugin configuration
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, pluginName, config, featureFlags } = body;

    if (!propertyId || !pluginName || !config) {
      return NextResponse.json(
        {
          error: 'propertyId, pluginName, and config are required',
        },
        { status: 400 }
      );
    }

    // Verify plugin is enabled for this property
    const existing = await db
      .prepare(
        `
      SELECT * FROM property_plugins WHERE property_id = $1 AND plugin_name = $2
    `
      )
      .get(propertyId, pluginName);

    if (!existing) {
      return NextResponse.json({ error: 'Plugin not enabled for this property' }, { status: 404 });
    }

    // Update configuration
    await db
      .prepare(
        `
      UPDATE property_plugins 
      SET config = $1,
          feature_flags = COALESCE($2, feature_flags),
          updated_at = CURRENT_TIMESTAMP
      WHERE property_id = $3 AND plugin_name = $4
    `
      )
      .run(
        JSON.stringify(config),
        featureFlags ? JSON.stringify(featureFlags) : null,
        propertyId,
        pluginName
      );

    // Log analytics event
    await db
      .prepare(
        `
      INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
      VALUES ($1, $2, $3, $4)
    `
      )
      .run(pluginName, propertyId, 'config_update', JSON.stringify({ config }));

    AuditService.log({
      userId: body.userId || 'system',
      action: 'plugin.config_update',
      resource: 'plugin',
      resourceId: pluginName,
      propertyId,
      details: { config, featureFlags },
    });

    return NextResponse.json({
      success: true,
      message: 'Plugin configuration updated',
    });
  } catch (err: any) {
    logger.error('[Plugins Update API] Error:', err);
    return errorResponse(err);
  }
}

// DELETE /api/plugins - Disable a plugin for a property
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const propertyId = searchParams.get('propertyId');
    const pluginName = searchParams.get('pluginName');
    const userId = searchParams.get('userId');

    if (!propertyId || !pluginName) {
      return NextResponse.json(
        {
          error: 'propertyId and pluginName are required',
        },
        { status: 400 }
      );
    }

    // Update to disable
    await db
      .prepare(
        `
      UPDATE property_plugins 
      SET is_enabled = false, 
          last_disabled_at = CURRENT_TIMESTAMP
      WHERE property_id = $1 AND plugin_name = $2
    `
      )
      .run(propertyId, pluginName);

    // Log analytics event
    await db
      .prepare(
        `
      INSERT INTO plugin_analytics (plugin_name, property_id, event_type, event_data)
      VALUES ($1, $2, $3, $4)
    `
      )
      .run(pluginName, propertyId, 'disable', JSON.stringify({ disabled_by: userId }));

    AuditService.log({
      userId: userId || 'system',
      action: 'plugin.disable',
      resource: 'plugin',
      resourceId: pluginName,
      propertyId,
      details: {},
    });

    return NextResponse.json({
      success: true,
      message: 'Plugin disabled successfully',
    });
  } catch (err: any) {
    logger.error('[Plugins Disable API] Error:', err);
    return errorResponse(err);
  }
}
