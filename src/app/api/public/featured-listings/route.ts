import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/public/featured-listings
 *
 * Returns a list of featured/curated listings for the homepage.
 * Accepts query params: ?limit=8&skip=0
 *
 * Response:
 * {
 *   "listings": [
 *     {
 *       "id": "uuid",
 *       "slug": "safari-camp",
 *       "name": "Safari Camp",
 *       "primaryImage": "https://...",
 *       "shortDescription": "...",
 *       "pricePerNight": 150,
 *       "rating": 4.8,
 *       "amenities": ["wifi", "pool", "restaurant"]
 *     }
 *   ],
 *   "total": 42
 * }
 */

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '8');
  const skip = parseInt(searchParams.get('skip') || '0');

  if (limit < 1 || limit > 50) {
    return NextResponse.json({ error: 'limit must be between 1 and 50' }, { status: 400 });
  }

  if (skip < 0) {
    return NextResponse.json({ error: 'skip must be >= 0' }, { status: 400 });
  }

  try {
    // Fetch featured listings from database
    const listings = await db
      .prepare(
        `
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.primary_image as "primaryImage",
        p.short_description as "shortDescription",
        p.price_per_night as "pricePerNight",
        p.rating,
        p.amenities
      FROM properties p
      WHERE p.is_featured = 1
        AND p.is_active = 1
      ORDER BY p.featured_order ASC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `
      )
      .all(limit, skip);

    // Get total count
    const countResult = await db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM properties p
      WHERE p.is_featured = 1
        AND p.is_active = 1
    `
      )
      .get();

    const total = countResult?.count || 0;

    return NextResponse.json({
      listings,
      total,
    });
  } catch (err: any) {
    logger.error('[Featured Listings API] Error:', err);
    return errorResponse(err);
  }
}
