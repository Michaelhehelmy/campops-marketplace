import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db
      .prepare(
        `
        SELECT
          platform_name as "platformName",
          support_email as "supportEmail",
          currency,
          timezone
        FROM marketplace_settings
        WHERE id = 'marketplace_settings'
        `
      )
      .get();

    const result = {
      platformName: settings?.platformName ?? 'SinaiCamps Marketplace',
      supportEmail: settings?.supportEmail ?? 'support@sinaicamps.com',
      currency: settings?.currency ?? 'USD',
      timezone: settings?.timezone ?? 'UTC',
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      platformName: 'SinaiCamps Marketplace',
      supportEmail: 'support@sinaicamps.com',
      currency: 'USD',
      timezone: 'UTC',
    });
  }
}
