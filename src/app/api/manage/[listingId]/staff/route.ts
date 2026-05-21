import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  const session = await requireListingAccess(req, params.listingId, [
    'manager',
    'marketplace_master',
  ]);
  if (isErrorResponse(session)) return session;

  const { listingId } = params;

  try {
    const property = (await db
      .prepare(`SELECT id FROM properties WHERE id = ? OR slug = ? LIMIT 1`)
      .get(listingId, listingId)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const staff = (await db
      .prepare(
        `SELECT ps.id, ps.user_id, ps.role, u.email, u.name
         FROM property_staff ps
         LEFT JOIN users u ON ps.user_id = u.id
         WHERE ps.property_id = ?
         ORDER BY ps.role ASC`
      )
      .all(property.id)) as any[];

    return NextResponse.json(
      staff.map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        name: s.name || 'Unknown',
        email: s.email || '',
        role: s.role,
        status: 'on_duty',
        phone: '',
      }))
    );
  } catch (err: any) {
    console.error('[Staff API] Error:', err);
    return NextResponse.json([]);
  }
}
