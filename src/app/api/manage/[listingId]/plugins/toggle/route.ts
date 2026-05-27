import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const toggleBodySchema = z.object({
  pluginName: z.string().min(1, 'pluginName is required'),
  isEnabled: z.boolean().optional(),
});

/**
 * POST /api/manage/[listingId]/plugins/toggle
 *
 * Enables or disables a plugin for a specific listing.
 * Requires listing-level access (manager or marketplace_master).
 */
export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const session = await requireListingAccess(req, listingId, ['manager', 'marketplace_master']);
    if (isErrorResponse(session)) return session;

    const parsed = toggleBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const { pluginName, isEnabled } = parsed.data;

    // Resolve propertyId
    let propertyId = listingId;
    const property = await db
      .prepare('SELECT id FROM properties WHERE id = ? OR slug = ?')
      .get(listingId, listingId);
    if (property) {
      propertyId = (property as any).id;
    }

    // Update property_plugins table
    // Use INSERT OR REPLACE (SQLite) or ON CONFLICT (PG)
    // In this codebase, we use SQLite for dev/test
    await db
      .prepare(
        `
      INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(property_id, plugin_name) DO UPDATE SET is_enabled = EXCLUDED.is_enabled
    `
      )
      .run(`assoc-${propertyId}-${pluginName}`, propertyId, pluginName, isEnabled ? 1 : 0);

    AuditService.log({
      userId: session.user?.id || 'system',
      action: isEnabled ? 'plugin.enable' : 'plugin.disable',
      resource: 'plugin',
      resourceId: pluginName,
      propertyId,
      details: { listingId },
    });

    return NextResponse.json({ ok: true, pluginName, isEnabled });
  } catch (err: any) {
    logger.error('[Plugin Toggle API] Error:', err);
    return errorResponse(err);
  }
}
