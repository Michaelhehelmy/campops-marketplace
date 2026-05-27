import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { drizzle } from '@/lib/db';
import { users, userRoles, accounts } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

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
    logger.error('Failed to fetch admins:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const body = await request.json();
    const { name, email, role, password } = body;

    logger.info('[Admin API] Creating admin:', { name, email, role });

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 6 characters' },
        { status: 400 }
      );
    }

    const id = Math.random().toString(36).substring(2, 11);
    const hashedPassword = await bcrypt.hash(password, 10);

    await drizzle.insert(users).values({
      id,
      name,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert accounts record so better-auth can verify credentials
    await drizzle.insert(accounts).values({
      id: `${id}-account`,
      userId: id,
      accountId: id,
      providerId: 'credential',
      password: hashedPassword,
    });

    logger.info('[Admin API] Admin created successfully:', id);

    await drizzle.insert(userRoles).values({
      id: `${id}-role`,
      userId: id,
      role,
      permissions: JSON.stringify(['admin_access']),
    });

    return NextResponse.json({ id, name, email, role, ok: true }, { status: 201 });
  } catch (error: any) {
    logger.error('[Admin API] Failed to create admin:', error);
    return errorResponse(error);
  }
}
