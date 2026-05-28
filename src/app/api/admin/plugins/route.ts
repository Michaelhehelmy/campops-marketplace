import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { z } from 'zod';

// GET /api/admin/plugins - List all available plugins in the marketplace catalog
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status === 'active') {
      whereClause += ` AND is_active = true`;
    } else if (status === 'inactive') {
      whereClause += ` AND is_active = false`;
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db
      .prepare(
        `
      SELECT COUNT(*) as total FROM available_plugins ${whereClause}
    `
      )
      .get(...params);

    const total = parseInt(countResult?.total || '0');

    // Get plugins with installation stats
    const plugins = await db
      .prepare(
        `
      SELECT 
        ap.*,
        (SELECT COUNT(*) FROM property_plugins WHERE plugin_name = ap.name) as total_installs,
        (SELECT COUNT(*) FROM property_plugins WHERE plugin_name = ap.name AND is_enabled = true) as active_installs
      FROM available_plugins ap
      ${whereClause}
      ORDER BY ap.is_official DESC, ap.display_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      plugins,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + plugins.length < total,
      },
    });
  } catch (err: any) {
    logger.error('[Admin Plugins API] Error:', err);
    return errorResponse(err);
  }
}

const createPluginSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  version: z.string().optional().default('1.0.0'),
  author: z.string().optional(),
  category: z.string().optional().default('general'),
  iconUrl: z.string().optional(),
  isOfficial: z.boolean().optional().default(false),
  isPremium: z.boolean().optional().default(false),
  priceCents: z.number().optional(),
  billingInterval: z.string().optional(),
  manifest: z.record(z.string(), z.any()).optional().default({}),
  entryPointUrl: z.string().optional(),
  cssUrl: z.string().optional(),
  configSchema: z.record(z.string(), z.any()).optional().default({}),
  requiredRoles: z.array(z.string()).optional().default([]),
  minPropertyPlan: z.string().optional().default('basic'),
  dependencies: z.array(z.string()).optional().default([]),
});

// POST /api/admin/plugins - Add a new plugin to the marketplace catalog
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const parsed = createPluginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const {
      name,
      displayName,
      description,
      version,
      author,
      category,
      iconUrl,
      isOfficial,
      isPremium,
      priceCents,
      billingInterval,
      manifest,
      entryPointUrl,
      cssUrl,
      configSchema,
      requiredRoles,
      minPropertyPlan,
      dependencies,
    } = parsed.data;

    if (!name || !displayName) {
      return NextResponse.json(
        {
          error: 'name and displayName are required',
        },
        { status: 400 }
      );
    }

    // Check if plugin name already exists
    const existing = await db
      .prepare(
        `
      SELECT id FROM available_plugins WHERE name = $1
    `
      )
      .get(name);

    if (existing) {
      return NextResponse.json({ error: 'Plugin with this name already exists' }, { status: 409 });
    }

    // Create plugin
    const result = await db
      .prepare(
        `
      INSERT INTO available_plugins 
      (name, display_name, description, version, author, category, icon_url, 
       is_official, is_premium, price_cents, billing_interval, manifest, 
       entry_point_url, css_url, config_schema, required_roles, min_property_plan, dependencies)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `
      )
      .run(
        name,
        displayName,
        description || null,
        version,
        author || null,
        category,
        iconUrl || null,
        isOfficial,
        isPremium,
        priceCents || null,
        billingInterval || null,
        JSON.stringify(manifest),
        entryPointUrl || null,
        cssUrl || null,
        JSON.stringify(configSchema),
        JSON.stringify(requiredRoles),
        minPropertyPlan,
        JSON.stringify(dependencies)
      );

    const pluginId = result.lastInsertRowid;
    const plugin = await db
      .prepare(
        `
      SELECT * FROM available_plugins WHERE id = $1
    `
      )
      .get(pluginId);

    return NextResponse.json(
      {
        success: true,
        plugin,
        message: 'Plugin added to marketplace catalog',
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error('[Admin Plugins Create API] Error:', err);
    return errorResponse(err);
  }
}

const updatePluginSchema = z.object({
  pluginName: z.string(),
  updates: z.record(z.string(), z.any()),
});

// PUT /api/admin/plugins - Update a plugin in the catalog
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const parsed = updatePluginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const { pluginName, updates } = parsed.data;

    if (!pluginName || !updates) {
      return NextResponse.json(
        {
          error: 'pluginName and updates are required',
        },
        { status: 400 }
      );
    }

    // Check if plugin exists
    const existing = await db
      .prepare(
        `
      SELECT * FROM available_plugins WHERE name = $1
    `
      )
      .get(pluginName);

    if (!existing) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Build dynamic update
    const allowedFields = [
      'display_name',
      'description',
      'version',
      'author',
      'category',
      'icon_url',
      'is_official',
      'is_premium',
      'price_cents',
      'billing_interval',
      'manifest',
      'entry_point_url',
      'css_url',
      'config_schema',
      'required_roles',
      'min_property_plan',
      'dependencies',
      'is_active',
    ];

    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField)) {
        updatesList.push(`${dbField} = $${paramIndex}`);
        // JSON fields need special handling
        if (['manifest', 'config_schema', 'required_roles', 'dependencies'].includes(dbField)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (updatesList.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updatesList.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;
    values.push(pluginName);

    await db
      .prepare(
        `
      UPDATE available_plugins 
      SET ${updatesList.join(', ')}
      WHERE name = $${paramIndex}
    `
      )
      .run(...values);

    const plugin = await db
      .prepare(
        `
      SELECT * FROM available_plugins WHERE name = $1
    `
      )
      .get(pluginName);

    return NextResponse.json({
      success: true,
      plugin,
      message: 'Plugin updated successfully',
    });
  } catch (err: any) {
    logger.error('[Admin Plugins Update API] Error:', err);
    return errorResponse(err);
  }
}

// DELETE /api/admin/plugins - Deactivate/remove a plugin from catalog
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const { searchParams } = req.nextUrl;
    const pluginName = searchParams.get('pluginName');

    if (!pluginName) {
      return NextResponse.json(
        {
          error: 'pluginName is required',
        },
        { status: 400 }
      );
    }

    // Soft delete - just mark as inactive
    await db
      .prepare(
        `
      UPDATE available_plugins 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE name = $1
    `
      )
      .run(pluginName);

    return NextResponse.json({
      success: true,
      message: `Plugin "${pluginName}" has been deactivated from the marketplace`,
    });
  } catch (err: any) {
    logger.error('[Admin Plugins Deactivate API] Error:', err);
    return errorResponse(err);
  }
}
