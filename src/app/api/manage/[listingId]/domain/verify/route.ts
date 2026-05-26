import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import dns from 'dns/promises';

export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  const session = await requireListingAccess(req, params.listingId, ['manager', 'marketplace_master']);
  if (isErrorResponse(session)) return session;

  const property = db
    .prepare(
      `SELECT custom_domain, subdomain FROM properties WHERE id = ? AND is_active = 1`
    )
    .get(params.listingId) as any;

  if (!property) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const domainToCheck = property.custom_domain || property.subdomain;
  if (!domainToCheck) {
    return NextResponse.json({ error: 'No domain to verify' }, { status: 400 });
  }

  try {
    await dns.resolve(domainToCheck);
    db.prepare(`UPDATE properties SET domain_verified = 1 WHERE id = ?`).run(params.listingId);
    return NextResponse.json({ verified: true, domain: domainToCheck });
  } catch {
    return NextResponse.json({ verified: false, domain: domainToCheck, message: 'DNS not yet propagated' });
  }
}
