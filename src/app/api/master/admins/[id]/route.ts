import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { drizzle } from '@/lib/db';
import { users, accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const body = await request.json();
    console.log('[PATCH Admin] Received body:', body, 'for ID:', params.id);
    const { name, email, role, status, password } = body;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = status === 'disabled' ? 'disabled' : role;

    await drizzle.update(users).set(updateData).where(eq(users.id, params.id));

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const existingAccount = await drizzle
        .select()
        .from(accounts)
        .where(eq(accounts.userId, params.id))
        .limit(1);

      if (existingAccount.length > 0) {
        await drizzle
          .update(accounts)
          .set({ password: hashedPassword })
          .where(eq(accounts.userId, params.id));
      } else {
        await drizzle.insert(accounts).values({
          id: `${params.id}-account`,
          userId: params.id,
          accountId: params.id,
          providerId: 'credential',
          password: hashedPassword,
        });
      }
      await drizzle.update(users).set({ password: hashedPassword }).where(eq(users.id, params.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[PATCH Admin] Failed to update admin:', error);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    await drizzle.delete(users).where(eq(users.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to delete admin:', error);
    return errorResponse(error);
  }
}
