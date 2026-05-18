import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/auth/me
 * Custom backward-compatibility endpoint for multi-tenant Vite/PWA custom shopfronts.
 * Direct database-backed session token validation.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Extract token from Authorization header or Cookies
    let token = '';
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      token =
        req.cookies.get('better-auth.session_token')?.value ||
        req.cookies.get('better-auth.session-token')?.value ||
        req.cookies.get('sinaicamps_token')?.value ||
        '';
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No session token provided' },
        { status: 401 }
      );
    }

    // 2. Fetch session from database
    const sessionRecord = await db
      .prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?')
      .get(token);

    if (!sessionRecord) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check expiration
    if (new Date(sessionRecord.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Session expired' },
        { status: 401 }
      );
    }

    const userId = sessionRecord.user_id;

    // 3. Fetch user details from database
    const userRecord = await db
      .prepare('SELECT id, email, name, image, role FROM users WHERE id = ?')
      .get(userId);

    if (!userRecord) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not found' },
        { status: 401 }
      );
    }

    // 4. Fetch role and permissions from user_roles table
    const userRoleRecord = await db
      .prepare('SELECT role, permissions FROM user_roles WHERE user_id = ?')
      .get(userId);

    const role = userRoleRecord?.role || userRecord.role || 'guest';
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

    // 5. Fetch tenant/listing associations from property_staff
    const staffRecords = await db
      .prepare('SELECT property_id FROM property_staff WHERE user_id = ?')
      .all(userId);

    const listing_ids = staffRecords.map((r: any) => r.property_id);

    return NextResponse.json({
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        image: userRecord.image,
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
