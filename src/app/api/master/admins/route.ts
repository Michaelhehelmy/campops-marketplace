import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { drizzle } from '@/lib/db';
import { users, userRoles } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const { searchParams } = new URL(request.url);
    const adminUsers = await drizzle
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        or(
          eq(users.role, 'master'),
          eq(users.role, 'marketplace_master'),
          eq(users.role, 'support'),
          eq(users.role, 'super_admin'),
          eq(users.role, 'disabled')
        )
      );

    // Map to the format expected by the frontend
    const formattedAdmins = adminUsers.map((user: any) => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      role:
        user.role === 'disabled' ? 'support' : user.role === 'support' ? 'support' : 'super_admin',
      status: user.role === 'disabled' ? 'disabled' : 'active',
      assignedListings: user.role === 'support' ? 0 : 42,
      lastLogin: 'Recent',
    }));

    return NextResponse.json(formattedAdmins);
  } catch (error) {
    console.error('Failed to fetch admins:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const body = await request.json();
    const { name, email, role } = body;

    console.log('[Admin API] Creating admin:', { name, email, role });

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const id = Math.random().toString(36).substring(2, 11);

    // Insert into users table
    await drizzle.insert(users).values({
      id,
      name,
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('[Admin API] Admin created successfully:', id);

    // Also insert into user_roles for compatibility if needed
    await drizzle.insert(userRoles).values({
      id: Math.random().toString(36).substring(2, 11),
      userId: id,
      role,
      permissions: JSON.stringify(['admin_access']),
    });

    return NextResponse.json({ id, name, email, role, ok: true }, { status: 201 });
  } catch (error: any) {
    console.error('[Admin API] Failed to create admin:', error);
    return errorResponse(error);
  }
}
