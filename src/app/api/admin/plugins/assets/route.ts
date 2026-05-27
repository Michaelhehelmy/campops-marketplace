import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

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

// GET /api/admin/plugins/assets - Get plugin assets for a plugin
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const adminId = searchParams.get('adminId');
    const pluginName = searchParams.get('pluginName');

    if (!adminId || !pluginName) {
      return NextResponse.json({ error: 'adminId and pluginName are required' }, { status: 400 });
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const assets = await db
      .prepare(
        `
      SELECT 
        id,
        asset_type,
        asset_url,
        target_location,
        load_order,
        cache_duration_seconds,
        is_active,
        created_at,
        updated_at
      FROM plugin_assets
      WHERE plugin_name = $1
      ORDER BY load_order, created_at
    `
      )
      .all(pluginName);

    return NextResponse.json({
      assets,
      pluginName,
      count: assets.length,
    });
  } catch (err: any) {
    logger.error('[Admin Plugin Assets API] Error:', err);
    return errorResponse(err);
  }
}

const createAssetSchema = z.object({
  adminId: z.string(),
  pluginName: z.string(),
  assetType: z.string(),
  assetUrl: z.string(),
  targetLocation: z.string().optional(),
  loadOrder: z.number().optional().default(0),
  cacheDurationSeconds: z.number().optional().default(3600),
});

// POST /api/admin/plugins/assets - Add a new asset to a plugin
export async function POST(req: NextRequest) {
  try {
    const parsed = createAssetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const {
      adminId,
      pluginName,
      assetType,
      assetUrl,
      targetLocation,
      loadOrder,
      cacheDurationSeconds,
    } = body;

    if (!adminId || !pluginName || !assetType || !assetUrl) {
      return NextResponse.json(
        {
          error: 'adminId, pluginName, assetType, and assetUrl are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate asset type
    const validTypes = ['script', 'stylesheet', 'icon', 'image', 'config'];
    if (!validTypes.includes(assetType)) {
      return NextResponse.json(
        {
          error: `Invalid assetType. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Verify plugin exists
    const plugin = await db
      .prepare(
        `
      SELECT name FROM available_plugins WHERE name = $1
    `
      )
      .get(pluginName);

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Create asset
    const result = await db
      .prepare(
        `
      INSERT INTO plugin_assets 
      (plugin_name, asset_type, asset_url, target_location, load_order, cache_duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `
      )
      .run(
        pluginName,
        assetType,
        assetUrl,
        targetLocation || null,
        loadOrder,
        cacheDurationSeconds
      );

    const assetId = result.lastInsertRowid;
    const asset = await db
      .prepare(
        `
      SELECT * FROM plugin_assets WHERE id = $1
    `
      )
      .get(assetId);

    return NextResponse.json(
      {
        success: true,
        asset,
        message: 'Asset added successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    logger.error('[Admin Plugin Assets Create API] Error:', err);
    return errorResponse(err);
  }
}

const updateAssetSchema = z.object({
  adminId: z.string(),
  assetId: z.union([z.string(), z.number()]),
  updates: z.record(z.string(), z.any()),
});

// PUT /api/admin/plugins/assets - Update an asset
export async function PUT(req: NextRequest) {
  try {
    const parsed = updateAssetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const { adminId, assetId, updates } = body;

    if (!adminId || !assetId || !updates) {
      return NextResponse.json(
        {
          error: 'adminId, assetId, and updates are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if asset exists
    const existing = await db
      .prepare(
        `
      SELECT * FROM plugin_assets WHERE id = $1
    `
      )
      .get(assetId);

    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Build update
    const allowedFields = [
      'asset_url',
      'target_location',
      'load_order',
      'cache_duration_seconds',
      'is_active',
    ];
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField)) {
        updatesList.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updatesList.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updatesList.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;
    values.push(assetId);

    await db
      .prepare(
        `
      UPDATE plugin_assets 
      SET ${updatesList.join(', ')}
      WHERE id = $${paramIndex}
    `
      )
      .run(...values);

    const asset = await db
      .prepare(
        `
      SELECT * FROM plugin_assets WHERE id = $1
    `
      )
      .get(assetId);

    return NextResponse.json({
      success: true,
      asset,
      message: 'Asset updated successfully',
    });
  } catch (err: any) {
    logger.error('[Admin Plugin Assets Update API] Error:', err);
    return errorResponse(err);
  }
}

// DELETE /api/admin/plugins/assets - Delete an asset
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const adminId = searchParams.get('adminId');
    const assetId = searchParams.get('assetId');

    if (!adminId || !assetId) {
      return NextResponse.json(
        {
          error: 'adminId and assetId are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if asset exists
    const existing = await db
      .prepare(
        `
      SELECT * FROM plugin_assets WHERE id = $1
    `
      )
      .get(assetId);

    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete asset
    await db
      .prepare(
        `
      DELETE FROM plugin_assets WHERE id = $1
    `
      )
      .run(assetId);

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (err: any) {
    logger.error('[Admin Plugin Assets Delete API] Error:', err);
    return errorResponse(err);
  }
}
