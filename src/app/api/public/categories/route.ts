import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/public/categories
 *
 * Returns property categories (e.g., Safari, Lodge, Lake View, Forest Retreat)
 * for the homepage category section.
 *
 * Response:
 * {
 *   "categories": [
 *     {
 *       "id": "safari",
 *       "name": "Safari",
 *       "slug": "safari",
 *       "icon": "🦁",
 *       "description": "Experience wildlife up close",
 *       "count": 12
 *     }
 *   ]
 * }
 */

export async function GET(req: NextRequest) {
  try {
    const categories = await db
      .prepare(
        `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.icon,
        c.description,
        COUNT(pc.property_id) as count
      FROM categories c
      LEFT JOIN property_categories pc ON pc.category_id = c.id
      LEFT JOIN properties p ON p.id = pc.property_id AND p.is_active = 1
      GROUP BY c.id, c.name, c.slug, c.icon, c.description
      ORDER BY c.display_order ASC, c.name ASC
    `
      )
      .all();

    return NextResponse.json({
      categories,
    });
  } catch (err: any) {
    console.error('[Categories API] Error:', err);
    return errorResponse(err);
  }
}
