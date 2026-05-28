import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/admin/shops - List all shops with filtering
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status === 'active') {
      whereClause += ` AND p.is_active = true`;
    } else if (status === 'inactive') {
      whereClause += ` AND p.is_active = false`;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.slug ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db
      .prepare(
        `
      SELECT COUNT(*) as total
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      ${whereClause}
    `
      )
      .get(...params);

    const total = parseInt(countResult?.total || '0');

    // Get shops
    const shops = await db
      .prepare(
        `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.type,
        p.city,
        p.country,
        p.currency_code,
        p.is_active,
        p.plan,
        p.subdomain,
        p.custom_domain,
        p.domain_verified,
        p.settings,
        p.created_at,
        p.updated_at,
        u.id as owner_id,
        u.email as owner_email,
        (SELECT COUNT(*) FROM property_staff WHERE property_id = p.id) as staff_count,
        (SELECT COUNT(*) FROM room_types WHERE property_id = p.id) as room_types_count
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      shops,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + shops.length < total,
      },
    });
  } catch (err: any) {
    logger.error('[Admin Shops API] Error:', err);
    return errorResponse(err);
  }
}

const bulkUpdateShopsSchema = z.object({
  shopIds: z.array(z.string()),
  action: z.string(),
});

// PUT /api/admin/shops - Bulk update shops (activate/deactivate multiple)
export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const parsed = bulkUpdateShopsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const { shopIds, action } = parsed.data;

    if (!shopIds || !Array.isArray(shopIds) || !action) {
      return NextResponse.json(
        {
          error: 'shopIds array, and action are required',
        },
        { status: 400 }
      );
    }

    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'activate' or 'deactivate'" },
        { status: 400 }
      );
    }

    const isActive = action === 'activate';

    // Perform bulk update in a transaction
    await db.transaction(async (tx) => {
      for (const shopId of shopIds) {
        await tx
          .prepare(
            `
          UPDATE properties 
          SET is_active = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `
          )
          .run(isActive, shopId);
      }
    });

    return NextResponse.json({
      success: true,
      message: `${shopIds.length} shops ${action}d`,
      affectedIds: shopIds,
    });
  } catch (err: any) {
    logger.error('[Admin Shops Bulk Update] Error:', err);
    return errorResponse(err);
  }
}
