import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function normalizeDomain(domain: string) {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const { listingId } = params;
    const body = await req.json().catch(() => null);

    if (!body?.domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const domain = normalizeDomain(body.domain);

    const existing = await db
      .prepare(
        `
      SELECT id, settings FROM properties
      WHERE id = $1 AND is_active = true
    `
      )
      .get(listingId);

    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    await db
      .prepare(
        `
      UPDATE properties
      SET settings = $1,
          custom_domain = $2,
          domain_verified = 1,
          plan = 'ultimate'
      WHERE id = $3
    `
      )
      .run(
        JSON.stringify({
          ...(typeof (existing as any).settings === 'string'
            ? JSON.parse((existing as any).settings || '{}')
            : (existing as any).settings || {}),
          customDomain: domain,
          customDomainVerified: true,
        }),
        domain,
        listingId
      );

    return NextResponse.json({
      ok: true,
      listingId,
      domain,
      status: 'purchased',
    });
  } catch (err: any) {
    console.error('[Manage Domain API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
