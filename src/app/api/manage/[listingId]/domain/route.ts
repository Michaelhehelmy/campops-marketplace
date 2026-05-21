import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import { validateBody } from '@/lib/validate';
import { z } from 'zod';

const domainSchema = z.object({
  domain: z.string().min(1).max(255),
});

function normalizeDomain(domain: string) {
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

export async function POST(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const session = await requireListingAccess(req, params.listingId, [
      'manager',
      'marketplace_master',
    ]);
    if (isErrorResponse(session)) return session;
    const { listingId } = params;
    const [body, validationError] = await validateBody(req, domainSchema);
    if (validationError) return validationError;

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

    AuditService.log({
      userId: (session as any).user?.id || 'system',
      action: 'domain.reserve',
      resource: 'property',
      resourceId: listingId,
      details: { domain, previousPlan: (existing as any).plan },
    });

    return NextResponse.json({
      ok: true,
      listingId,
      domain,
      status: 'purchased',
    });
  } catch (err: any) {
    console.error('[Manage Domain API] Error:', err);
    return errorResponse(err);
  }
}
