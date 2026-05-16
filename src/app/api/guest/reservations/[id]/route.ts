import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const reservationId = params.id;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const reservation = await db
      .prepare(
        `SELECT
          r.id,
          r.property_id,
          p.name AS property_name,
          p.slug AS property_slug,
          r.check_in,
          r.check_out,
          r.status,
          r.total_price AS total_amount,
          r.guest_count
        FROM reservations r
        LEFT JOIN properties p ON r.property_id = p.id
        WHERE r.id = ? AND r.user_id = ?
        LIMIT 1`
      )
      .get(reservationId, userId);

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Failed to fetch reservation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
