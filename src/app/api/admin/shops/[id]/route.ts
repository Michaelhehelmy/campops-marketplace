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

// GET /api/admin/shops/:id - Get single shop details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shopId = params.id;
    const adminId = req.nextUrl.searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const shop = await db
      .prepare(
        `
      SELECT 
        p.*,
        u.id as owner_id,
        u.email as owner_email,
        pr.phone as owner_phone,
        pr.full_name as owner_full_name,
        (SELECT COUNT(*) FROM property_staff WHERE property_id = p.id) as staff_count,
        (SELECT COUNT(*) FROM room_types WHERE property_id = p.id) as room_types_count,
        (SELECT COUNT(*) FROM reservations WHERE property_id = p.id) as reservations_count,
        (SELECT json_group_array(json_object(
          'plugin_name', plugin_name,
          'is_enabled', is_enabled,
          'config', config
        )) FROM property_plugins WHERE property_id = p.id) as plugins
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE p.id = $1
    `
      )
      .get(shopId);

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({ shop });
  } catch (err: any) {
    console.error('[Admin Shop Detail API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/shops/:id/deactivate - Deactivate a shop
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shopId = params.id;
    const body = await req.json();
    const { adminId, reason } = body;

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if shop exists
    const shop = await db
      .prepare('SELECT id, name, is_active FROM properties WHERE id = $1')
      .get(shopId);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Deactivate shop and log the action
    await db.transaction(async (tx) => {
      await tx
        .prepare(
          `
        UPDATE properties 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `
        )
        .run(shopId);

      // Log the admin action in audit_logs
      await tx
        .prepare(
          `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `
        )
        .run(
          adminId,
          'shop_deactivate',
          'properties',
          shopId,
          JSON.stringify({ reason, previous_status: shop.is_active })
        );
    });

    return NextResponse.json({
      success: true,
      message: `Shop "${shop.name}" has been deactivated`,
      shopId,
      reason,
    });
  } catch (err: any) {
    console.error('[Admin Shop Deactivate API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/shops/:id/override - Override shop listing data
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shopId = params.id;
    const body = await req.json();
    const { adminId, overrides } = body;

    if (!adminId || !overrides || typeof overrides !== 'object') {
      return NextResponse.json(
        {
          error: 'adminId and overrides object are required',
        },
        { status: 400 }
      );
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if shop exists
    const shop = await db
      .prepare('SELECT id, name, settings FROM properties WHERE id = $1')
      .get(shopId);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Build update fields dynamically
    const allowedFields = ['name', 'description', 'type', 'city', 'country', 'currency_code'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(overrides)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Handle settings override specially (merge with existing)
    if (overrides.settings && typeof overrides.settings === 'object') {
      const currentSettings = shop.settings || {};
      const newSettings = { ...currentSettings, ...overrides.settings, admin_override: true };
      updates.push(`settings = $${paramIndex}`);
      values.push(JSON.stringify(newSettings));
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(shopId);

    // Perform update in transaction with audit log
    await db.transaction(async (tx) => {
      await tx
        .prepare(
          `
        UPDATE properties 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `
        )
        .run(...values);

      // Log the admin action
      await tx
        .prepare(
          `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `
        )
        .run(
          adminId,
          'shop_override',
          'properties',
          shopId,
          JSON.stringify({ overrides, previous_name: shop.name })
        );
    });

    return NextResponse.json({
      success: true,
      message: `Shop "${shop.name}" has been updated`,
      shopId,
      overrides,
    });
  } catch (err: any) {
    console.error('[Admin Shop Override API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/shops/:id/activate - Activate a shop
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const shopId = params.id;
    const body = await req.json();
    const { adminId } = body;

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 });
    }

    // Verify admin access
    const isAdmin = await verifyAdminAccess(adminId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if shop exists
    const shop = await db
      .prepare('SELECT id, name, is_active FROM properties WHERE id = $1')
      .get(shopId);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Activate shop and log the action
    await db.transaction(async (tx) => {
      await tx
        .prepare(
          `
        UPDATE properties 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `
        )
        .run(shopId);

      // Log the admin action
      await tx
        .prepare(
          `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `
        )
        .run(
          adminId,
          'shop_activate',
          'properties',
          shopId,
          JSON.stringify({ previous_status: shop.is_active })
        );
    });

    return NextResponse.json({
      success: true,
      message: `Shop "${shop.name}" has been activated`,
      shopId,
    });
  } catch (err: any) {
    console.error('[Admin Shop Activate API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
