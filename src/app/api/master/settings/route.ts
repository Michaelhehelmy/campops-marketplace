import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;

    const settings = await db
      .prepare(
        `
        SELECT 
          platform_name as "platformName",
          support_email as "supportEmail",
          currency,
          timezone,
          commission_rate as "commissionRate",
          min_booking_fee as "minBookingFee"
        FROM marketplace_settings
        WHERE id = 'marketplace_settings'
        `
      )
      .get();

    if (!settings) {
      // Fallback defaults if somehow no record exists
      return NextResponse.json({
        platformName: 'SinaiCamps Marketplace',
        supportEmail: 'support@sinaicamps.com',
        currency: 'USD',
        timezone: 'UTC',
        commissionRate: 10.0,
        minBookingFee: 1.5,
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const body = await request.json();

    await db
      .prepare(
        `
        UPDATE marketplace_settings SET
          platform_name = COALESCE(?, platform_name),
          support_email = COALESCE(?, support_email),
          currency = COALESCE(?, currency),
          timezone = COALESCE(?, timezone),
          commission_rate = COALESCE(?, commission_rate),
          min_booking_fee = COALESCE(?, min_booking_fee),
          updated_at = (strftime('%s', 'now') * 1000)
        WHERE id = 'marketplace_settings'
        `
      )
      .run(
        body.platformName,
        body.supportEmail,
        body.currency,
        body.timezone,
        body.commissionRate,
        body.minBookingFee
      );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return errorResponse(error);
  }
}
