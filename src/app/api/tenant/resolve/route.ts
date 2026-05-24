import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host')?.toLowerCase().trim();
  const BASE_DOMAIN = (process.env.BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();

  if (!host) {
    return NextResponse.json({ error: 'host query parameter is required' }, { status: 400 });
  }

  const hostname = host.split(':')[0].replace(/^www\./, '');

  if (hostname === '127.0.0.1') {
    return NextResponse.json({
      property: { id: '3', name: 'Acacia Camp', slug: 'acacia', plan: 'ultimate' },
    });
  }

  const parseSettings = (value: unknown) => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value || '{}');
      } catch {
        return {};
      }
    }
    return value as Record<string, unknown>;
  };

  try {
    // 1. Custom Domain Match
    const property = (await db
      .prepare(
        `
      SELECT *
      FROM properties
      WHERE is_active = true
        AND (
          custom_domain = ?
          OR COALESCE(json_extract(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.customDomain'), '') = ?
        )
      LIMIT 1
    `
      )
      .get(hostname, hostname)) as any;

    if (property) {
      const settings = parseSettings(property.settings);
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const legacyVerified =
        property.custom_domain === hostname && ![false, 0, '0'].includes(property.domain_verified);
      const jsonVerified = [true, 1, '1', 'true'].includes(settings.customDomainVerified as any);
      const verified = Boolean(legacyVerified || jsonVerified || isLocal);
      if (!verified) {
        return NextResponse.json(
          { property: null, error: 'Domain not yet verified' },
          { status: 404 }
        );
      }
    }

    // 2. Subdomain Match (also fall back to slug for test environments)
    let resolvedProperty = property;
    if (!resolvedProperty && hostname.endsWith(`.${BASE_DOMAIN}`)) {
      const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
      resolvedProperty = (await db
        .prepare(
          `
        SELECT id, name, slug, plan, subdomain, settings
        FROM properties
        WHERE is_active = true AND (subdomain = ? OR slug = ?)
        LIMIT 1
      `
        )
        .get(sub, sub)) as any;

      // Basic plan tenants cannot use subdomains — they must stay on the marketplace
      if (resolvedProperty && resolvedProperty.plan === 'basic') {
        return NextResponse.json({ property: null }, { status: 404 });
      }
    }

    // Custom domain match: Basic/Standard plan tenants cannot use custom domains
    if (resolvedProperty && resolvedProperty.plan === 'basic' && !hostname.endsWith(`.${BASE_DOMAIN}`)) {
      return NextResponse.json({ property: null }, { status: 404 });
    }

    if (!resolvedProperty) {
      return NextResponse.json({ property: null }, { status: 404 });
    }

    return NextResponse.json({
      property: {
        id: resolvedProperty.id,
        name: resolvedProperty.name,
        slug: resolvedProperty.slug,
        plan: resolvedProperty.plan,
      },
    });
  } catch (err: any) {
    logger.error('Error:', err);
    return errorResponse(err);
  }
}
