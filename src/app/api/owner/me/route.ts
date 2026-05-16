import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * GET /api/owner/me
 *
 * Returns the property associated with the currently logged-in manager or staff member.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = session;

    // 1. Check if user is a direct owner (manager)
    let property = await db.prepare('SELECT * FROM properties WHERE owner_id = ?').get(user.id);

    // 2. If not owner, check if user is staff for a property
    if (!property) {
      const staffRecord = await db
        .prepare('SELECT property_id FROM property_staff WHERE user_id = ?')
        .get(user.id);

      if (staffRecord) {
        property = await db
          .prepare('SELECT * FROM properties WHERE id = ?')
          .get(staffRecord.property_id);
      }
    }

    if (!property) {
      return NextResponse.json({ error: 'No associated property found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user as any).role,
      },
      property: {
        id: property.id,
        name: property.name,
        slug: property.slug,
        plan: property.plan || 'basic',
        isActive: property.is_active === 1,
      },
    });
  } catch (err: any) {
    console.error('[Owner Me API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
