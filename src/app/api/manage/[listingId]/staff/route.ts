import { NextResponse } from 'next/server';
import { drizzle } from '@/lib/db';
import { propertyStaff, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: { listingId: string } }) {
  const { listingId } = params;

  try {
    const staffMembers = await drizzle
      .select({
        id: propertyStaff.id,
        name: users.name,
        role: propertyStaff.role,
        email: users.email,
      })
      .from(propertyStaff)
      .leftJoin(users, eq(propertyStaff.userId, users.id))
      .where(eq(propertyStaff.tenantId, listingId));

    // Map to frontend format
    const formatted = staffMembers.map((s: any) => ({
      id: s.id,
      name: s.name || 'Unknown Staff',
      role: s.role,
      status: 'on_duty', // Mocked for now
      phone: '+1 234 567 890', // Mocked for now
      email: s.email,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch staff:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
