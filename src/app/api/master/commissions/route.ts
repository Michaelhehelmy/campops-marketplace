import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId || adminId !== 'master-admin') {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch properties and their commission rates
    const properties = await db.prepare('SELECT id, name, slug FROM properties').all();

    // Fetch bookings to calculate volume
    const bookings = await db
      .prepare('SELECT property_id, total_amount_cents, status FROM marketplace_bookings')
      .all();

    // Fetch commission rates
    const rates = await db
      .prepare('SELECT property_id, rate_percentage FROM commission_rates WHERE is_active = 1')
      .all();
    const globalRate = await db
      .prepare(
        'SELECT rate_percentage FROM commission_rates WHERE property_id IS NULL AND is_active = 1'
      )
      .get();

    const reports = properties.map((p: any) => {
      const propertyBookings = bookings.filter((b: any) => b.property_id === p.id);
      const volume =
        propertyBookings.reduce((sum: number, b: any) => sum + b.total_amount_cents, 0) / 100;

      const rateObj = rates.find((r: any) => r.property_id === p.id);
      const rate = rateObj ? rateObj.rate_percentage : globalRate?.rate_percentage || 10.0;

      const commission = (volume * rate) / 100;

      return {
        id: p.id,
        shop: p.name,
        volume,
        commission,
        rate: `${rate}%`,
        status: volume > 0 ? 'paid' : 'n/a',
      };
    });

    const totalFees = reports.reduce((sum: number, r: any) => sum + r.commission, 0);
    const pendingPayouts = totalFees * 0.1; // Simulated
    const avgCommission =
      reports.length > 0
        ? reports.reduce((sum: number, r: any) => sum + parseFloat(r.rate), 0) / reports.length
        : 10.0;

    return NextResponse.json({
      reports,
      stats: {
        totalFees,
        pendingPayouts,
        avgCommission,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch commissions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
