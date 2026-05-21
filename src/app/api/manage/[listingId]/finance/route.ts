import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  const session = await requireListingAccess(req, params.listingId, [
    'manager',
    'marketplace_master',
  ]);
  if (isErrorResponse(session)) return session;

  const { listingId } = params;

  try {
    const property = (await db
      .prepare(`SELECT id, plan, currency_code FROM properties WHERE id = ? OR slug = ? LIMIT 1`)
      .get(listingId, listingId)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const commissionRate = (await db
      .prepare(
        `SELECT rate_percentage FROM commission_rates WHERE property_id = ? ORDER BY created_at DESC LIMIT 1`
      )
      .get(property.id)) as any;

    const reservations = (await db
      .prepare(
        `SELECT id, total_price, status, created_at FROM reservations WHERE property_id = ? ORDER BY created_at DESC LIMIT 20`
      )
      .all(property.id)) as any[];

    const totalRevenue = reservations.reduce(
      (sum: number, r: any) => sum + (r.total_price || 0),
      0
    );
    const confirmedCount = reservations.filter((r: any) => r.status === 'confirmed').length;

    return NextResponse.json({
      stats: {
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        netPayouts: `$${(totalRevenue * 0.9).toFixed(2)}`,
        commissionFees: `$${(totalRevenue * 0.1).toFixed(2)}`,
        avgBooking: confirmedCount > 0 ? `$${(totalRevenue / confirmedCount).toFixed(2)}` : '$0.00',
        trends: { revenue: '+0%', payouts: '+0%', fees: '+0%', avg: '+0%' },
      },
      transactions: reservations.map((r: any) => ({
        id: r.id,
        amount: r.total_price || 0,
        fee: (r.total_price || 0) * 0.1,
        net: (r.total_price || 0) * 0.9,
        date: r.created_at || '',
        status: r.status,
      })),
      commissionRate: commissionRate ? `${(commissionRate.rate * 100).toFixed(1)}%` : '10.0%',
    });
  } catch (err: any) {
    console.error('[Finance API] Error:', err);
    return NextResponse.json({
      stats: {
        totalRevenue: '$0',
        netPayouts: '$0',
        commissionFees: '$0',
        avgBooking: '$0',
        trends: { revenue: '+0%', payouts: '+0%', fees: '+0%', avg: '+0%' },
      },
      transactions: [],
      commissionRate: '10.0%',
    });
  }
}
