import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to verify marketplace_master role
async function verifyAdminAccess(userId: string): Promise<boolean> {
  const role = await db
    .prepare(
      `
    SELECT role FROM user_roles 
    WHERE user_id = $1 AND role = 'marketplace_master'
  `
    )
    .get(userId);

  return !!role;
}

// GET /api/admin/plugins - List all available plugins in the marketplace catalog
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const adminId = searchParams.get('adminId');
    const category = searchParams.get('category');
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: marketplace_master role required' },
        { status: 403 }
      );
    }

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
    console.error('[Admin Plugins API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/plugins - Add a new plugin to the marketplace catalog
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      adminId,
      name,
      displayName,
      description,
      version = '1.0.0',
      author,
      category = 'general',
      iconUrl,
      isOfficial = false,
      isPremium = false,
      priceCents,
      billingInterval,
      manifest = {},
      entryPointUrl,
      cssUrl,
      configSchema = {},
      requiredRoles = [],
      minPropertyPlan = 'basic',
      dependencies = [],
    } = body;

    if (!adminId || !name || !displayName) {
      return NextResponse.json(
        {
          error: 'adminId, name, and displayName are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    console.error('[Admin Plugins Create API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/plugins - Update a plugin in the catalog
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminId, pluginName, updates } = body;

    if (!adminId || !pluginName || !updates) {
      return NextResponse.json(
        {
          error: 'adminId, pluginName, and updates are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    console.error('[Admin Plugins Update API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/plugins - Deactivate/remove a plugin from catalog
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const adminId = searchParams.get('adminId');
    const pluginName = searchParams.get('pluginName');

    if (!adminId || !pluginName) {
      return NextResponse.json(
        {
          error: 'adminId and pluginName are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    console.error('[Admin Plugins Deactivate API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
