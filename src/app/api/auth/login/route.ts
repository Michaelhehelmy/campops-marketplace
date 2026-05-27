import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/login
 * Custom backward-compatibility endpoint for multi-tenant Vite/PWA custom shopfronts.
 * Authenticates email/password using Better-Auth internally and returns token & RBAC context.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Authenticate using Better-Auth programmatically
    const authResult = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    if (!authResult || !authResult.token) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { token, user } = authResult;

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
      token,
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
    logger.error('[API Auth Login] Programmatic authenticate failed:', err);
    return NextResponse.json(
      { error: 'Invalid credentials', message: err.message },
      { status: 401 }
    );
  }
}
