import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/auth/me
 * Custom backward-compatibility endpoint for multi-tenant Vite/PWA custom shopfronts.
 * Extracts the session user context based on Bearer token or session cookies.
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

    // Fetch role and permissions from user_roles table
    const userRoleRecord = await db
      .prepare('SELECT role, permissions FROM user_roles WHERE user_id = ?')
      .get(user.id);

    const role = userRoleRecord?.role || (user as any).role || 'guest';
    let permissions = [];
    if (userRoleRecord?.permissions) {
      try {
        permissions =
          typeof userRoleRecord.permissions === 'string'
            ? JSON.parse(userRoleRecord.permissions)
            : userRoleRecord.permissions;
      } catch {
        permissions = [];
      }
    }

    // Fetch tenant/listing associations from property_staff
    const staffRecords = await db
      .prepare('SELECT property_id FROM property_staff WHERE user_id = ?')
      .all(user.id);

    const listing_ids = staffRecords.map((r: any) => r.property_id);

    return NextResponse.json({
      token: session.session.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      role,
      permissions,
      listing_ids,
    });
  } catch (err: any) {
    console.error('[API Auth Me] Resolve session user failed:', err);
    return NextResponse.json({ error: 'Unauthorized', message: err.message }, { status: 401 });
  }
}
