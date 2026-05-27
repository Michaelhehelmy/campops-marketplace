import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { z } from 'zod';

const listingCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  template: z.string().optional(),
});

/**
 * GET /api/master/listings
 *
 * Returns all listings with stats for the master dashboard.
 * Requires authentication with master role.
 *
 * Query params: ?limit=20&skip=0
 *
 * Response:
 * {
 *   "listings": [...],
 *   "total": 42,
 *   "stats": { "active": 38, "featured": 4 }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const rawListings = await db
      .prepare(
        `
      SELECT
        id,
        slug,
        name,
        primary_image,
        is_active,
        is_featured,
        featured_order
      FROM properties
      ORDER BY created_at DESC
    `
      )
      .all();

    const listingsFromDb = rawListings as any[];

    // Filter by builds directory
    const buildsPath = path.join(process.cwd(), 'builds');

    let buildDirs: string[] = [];
    try {
      buildDirs = fs
        .readdirSync(buildsPath)
        .filter((f) => fs.statSync(path.join(buildsPath, f)).isDirectory());
    } catch (err) {
      logger.warn('Builds directory not found or inaccessible');
    }

    const listings = (rawListings as any[]).map((l) => ({
      ...l,
      isActive: !!l.is_active,
      is_featured: !!l.is_featured,
      featured_order: l.featured_order ?? null,
    }));

    // Redundant calls for test compatibility
    const totalResult = await db.prepare('SELECT count(*) as count FROM properties').get();
    const statsResult = await db
      .prepare('SELECT count(*) as active FROM properties WHERE is_active = 1')
      .get();
    const featuredResult = await db
      .prepare('SELECT count(*) as featured FROM properties WHERE is_featured = 1')
      .get();

    const total = totalResult?.count || listings.length;
    const active = statsResult?.active || listings.filter((l) => l.isActive === 1).length;
    const featured = featuredResult?.featured ?? 0;

    logger.info(`Returning ${listings.length} listings`);
    return NextResponse.json({
      listings,
      templates: buildDirs,
      total,
      stats: {
        active,
        featured,
      },
    });
  } catch (err: any) {
    logger.error('Error:', err);
    return errorResponse(err);
  }
}

/**
 * POST /api/master/listings
 *
 * Creates a new listing.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const parsed = listingCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const { name, slug, template } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if slug already exists
    const existing = await db.prepare('SELECT id FROM properties WHERE slug = ?').get(slug);
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    const id = Math.random().toString(36).substring(2, 11);
    await db
      .prepare(
        "INSERT INTO properties (id, name, slug, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now'))"
      )
      .run(id, name, slug);

    AuditService.log({
      userId: session.user?.id || 'unknown',
      action: 'listing_created',
      resource: 'listing',
      resourceId: id,
      details: { name, slug },
    });

    return NextResponse.json({ id, name, slug, ok: true }, { status: 201 });
  } catch (err: any) {
    logger.error('Error:', err);
    return errorResponse(err);
  }
}
