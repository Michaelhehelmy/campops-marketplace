import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/manage/commissions
 *
 * Returns commission data for all bookings.
 * Requires authentication with manager or staff role.
 *
 * Response:
 * {
 *   "commissions": [...]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Get commission rate from commission_rates table
    const commissionRateResult = await db
      .prepare(
        `
      SELECT rate_percentage
      FROM commission_rates
      WHERE is_active = 1
      LIMIT 1
    `
      )
      .get();

    const commissionRate = commissionRateResult?.rate_percentage || 10;

    // Get all reservations and calculate commission
    const reservations = await db
      .prepare(
        `
      SELECT 
        r.id as bookingId,
        r.total_price as totalPrice,
        r.status,
        r.created_at as createdAt
      FROM reservations r
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, skip);

    const commissions = reservations.map((r: any) => {
      const commissionAmount = (r.totalPrice * commissionRate) / 100;
      return {
        bookingId: r.bookingId,
        commissionRate,
        commissionAmount,
        paymentStatus: r.status === 'confirmed' ? 'pending' : 'cancelled',
        paymentDate: null,
      };
    });

    return NextResponse.json({
      commissions,
      total: commissions.length,
    });
  } catch (err: any) {
    console.error('[Commissions API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
