import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeDomain(domain: string) {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  const normalized = normalizeDomain(domain);

  try {
    const candidates = (await db
      .prepare(
        `
      SELECT id, slug, custom_domain, subdomain, settings
      FROM properties
      WHERE is_active = true
    `
      )
      .all()) as any[];

    const taken = candidates.find((row) => {
      const settings =
        typeof row.settings === 'string' ? JSON.parse(row.settings || '{}') : row.settings || {};
      const customDomain = row.custom_domain || settings.customDomain;
      return customDomain === normalized || row.subdomain === normalized;
    });

    if (taken) {
      return NextResponse.json({
        domain: normalized,
        available: false,
        takenBy: taken.slug,
        message: `Domain ${normalized} is already taken.`,
      });
    }

    return NextResponse.json({
      domain: normalized,
      available: true,
      message: `Domain ${normalized} is available.`,
    });
  } catch (err: any) {
    console.error('[Domain Check] Error:', err);
    return errorResponse(err);
  }
}
