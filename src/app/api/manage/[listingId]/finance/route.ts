import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;

    // Try to fetch from plugin_booking_bookings first, fall back to reservations, then defaults
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let transactions: any[] = [];

    try {
      // Try booking plugin table first
      const revenueRow = db
        .prepare(
          `SELECT SUM(total_price) as total FROM plugin_booking_bookings WHERE listing_id = ? AND status IN ('confirmed','checked-in','checked-out')`
        )
        .get(listingId) as any;
      totalRevenue = revenueRow?.total || 0;

      const txRaw = db
        .prepare(
          `SELECT id, total_price, status, created_at FROM plugin_booking_bookings WHERE listing_id = ? AND status IN ('confirmed','checked-in','checked-out') ORDER BY created_at DESC LIMIT 10`
        )
        .all(listingId) as any[];
      const commissionRateNum = 10.0;
      transactions = txRaw.map((b: any) => {
        const gross = b.total_price || 0;
        const fee = (gross * commissionRateNum) / 100;
        return { id: b.id, date: b.created_at || 'Recent', amount: gross, fee, net: gross - fee };
      });
    } catch (_e1) {
      try {
        // Fall back to legacy reservations table
        const revenueRow = db
          .prepare(
            `SELECT SUM(total_price) as total FROM reservations WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?)) AND status IN ('confirmed','checked-in')`
          )
          .get(listingId, listingId) as any;
        totalRevenue = revenueRow?.total || 0;
      } catch (_e2) {
        // Neither table exists — use zero defaults
      }
    }

    const commissionRateNum = 10.0;
    const commissionFees = (totalRevenue * commissionRateNum) / 100;
    const netPayouts = totalRevenue - commissionFees;
    const avgBooking = transactions.length > 0 ? totalRevenue / transactions.length : 0;

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
      },
      commission: {
        rate: commissionRateNum,
        totalPaid: commissionFees,
      },
      stats: {
        totalRevenue: `$${totalRevenue.toLocaleString()}`,
        netPayouts: `$${netPayouts.toLocaleString()}`,
        commissionFees: `$${commissionFees.toLocaleString()}`,
        avgBooking: `$${avgBooking.toLocaleString()}`,
        trends: {
          revenue: '+12.4%',
          payouts: '+10.2%',
          fees: '+12.4%',
          avg: '+5.1%',
        },
      },
      transactions,
      commissionRate: `${commissionRateNum}%`,
    });
  } catch (err: any) {
    console.error('[Manager Finance API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
