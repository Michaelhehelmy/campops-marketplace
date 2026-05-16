import { NextResponse } from 'next/server';
import { drizzle } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await drizzle.delete(users).where(eq(users.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to delete admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
