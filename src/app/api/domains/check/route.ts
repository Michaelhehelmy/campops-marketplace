import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'manage', 'owner', 'guest', 'book', 'stay',
  'login', 'logout', 'auth', 'search', 'docs', 'health',
  'metrics', 'status', 'support', 'help', 'www', 'app',
  'dashboard', 'settings', 'plugins', 'stripe', 'paymob',
]);

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

  if (RESERVED_SLUGS.has(normalized)) {
    return NextResponse.json({ available: false, reason: 'reserved' });
  }

  if (!/^[a-z0-9][a-z0-9.-]{1,48}[a-z0-9]$/.test(normalized)) {
    return NextResponse.json({ available: false, reason: 'invalid_format' });
  }

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
      return customDomain === normalized || row.subdomain === normalized || row.slug === normalized;
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
    logger.error('[Domain Check] Error:', err);
    return errorResponse(err);
  }
}
