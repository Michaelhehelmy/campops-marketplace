import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/manage/[listingId]/plugins/enabled
 *
 * Returns the list of enabled plugin IDs for a listing.
 */
export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const session = await requireListingAccess(req, params.listingId, [
      'manager',
      'marketplace_master',
    ]);
    if (isErrorResponse(session)) return session;
    const { listingId } = params;

    const rows = await db
      .prepare(
        `
      SELECT plugin_name
      FROM property_plugins
      WHERE property_id = ? AND is_enabled = 1
    `
      )
      .all(listingId);

    const enabled = (rows as any[]).map((r: any) => r.plugin_name);

    return NextResponse.json({ enabled });
  } catch (err: any) {
    logger.error('[Manage Plugins Enabled API] Error:', err);
    return errorResponse(err);
  }
}
