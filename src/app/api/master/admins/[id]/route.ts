import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { drizzle } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const body = await request.json();
    console.log('[PATCH Admin] Received body:', body, 'for ID:', params.id);
    const { name, email, role, status } = body;

    const result = await drizzle
      .update(users)
      .set({
        name,
        email,
        role: status === 'disabled' ? 'disabled' : role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.id));

    console.log('[PATCH Admin] Update result:', result);
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
