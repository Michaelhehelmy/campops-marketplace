import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    // In a real app, these might be in a 'settings' table
    // For now, we'll try to fetch from a mock settings table or just return default values
    // if the table doesn't exist yet.

    let settings = {
      platformName: 'SinaiCamps Marketplace',
      supportEmail: 'support@sinaicamps.com',
      currency: 'USD',
      timezone: 'UTC',
      commissionRate: 10.0,
      minBookingFee: 1.5,
    };

    try {
      const dbSettings = await db
        .prepare("SELECT config FROM homepage_config WHERE id = 'marketplace_settings'")
        .get();
      if (dbSettings?.config) {
        // Config is already parsed as JSON by the database wrapper
        const parsedConfig =
          typeof dbSettings.config === 'string' ? JSON.parse(dbSettings.config) : dbSettings.config;
        settings = { ...settings, ...parsedConfig };
      }
    } catch (e: any) {
      // Table might not exist or ID not found
      console.error('[Settings API] Error fetching settings:', e.message);
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
      INSERT INTO homepage_config (id, config)
      VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET config = excluded.config
    `
      )
      .run('marketplace_settings', JSON.stringify(body));

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return errorResponse(error);
  }
}
