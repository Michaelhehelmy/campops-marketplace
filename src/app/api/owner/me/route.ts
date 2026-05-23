import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = session;

    let property = await db.queryOne('SELECT * FROM properties WHERE owner_id = ?', [
      user.id,
    ]);

    if (!property) {
      const staffRecord = await db.queryOne(
        'SELECT property_id FROM property_staff WHERE user_id = ?',
        [user.id]
      );
      if (staffRecord) {
        property = await db.queryOne('SELECT * FROM properties WHERE id = ?', [
          (staffRecord as any).property_id,
        ]);
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
        id: (property as any).id,
        name: (property as any).name,
        slug: (property as any).slug,
        plan: (property as any).plan || 'basic',
        isActive: (property as any).is_active === 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
