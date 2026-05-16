import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * POST /api/manage/[listingId]/plugins/toggle
 *
 * Enables or disables a plugin for a specific listing.
 */
export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pluginName, isEnabled } = body;

    if (!pluginName) {
      return NextResponse.json({ error: 'pluginName is required' }, { status: 400 });
    }

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

    return NextResponse.json({ ok: true, pluginName, isEnabled });
  } catch (err: any) {
    console.error('[Plugin Toggle API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
