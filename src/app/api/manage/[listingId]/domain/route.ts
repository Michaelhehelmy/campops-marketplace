import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { requireListingAccess, isErrorResponse } from '@/lib/auth-middleware';
import { validateBody } from '@/lib/validate';
import { z } from 'zod';
import {
  provisionSubdomain,
  provisionCustomDomain,
  removeDomainProvisioning,
  removeSubdomainProvisioning,
} from '@/lib/domain-provisioning';

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

function isSubdomain(domain: string): boolean {
  const base = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();
  return domain.endsWith(`.${base}`) || domain === base;
}

function extractSlug(domain: string): string | null {
  const base = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();
  if (domain.endsWith(`.${base}`)) {
    return domain.slice(0, -(base.length + 1));
  }
  return null;
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

    const existing = (await db
      .prepare(
        `SELECT id, plan, settings, slug, subdomain, custom_domain
         FROM properties
         WHERE id = ? AND is_active = true`
      )
      .get(listingId)) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const currentSettings = (() => {
      if (!existing.settings) return {};
      if (typeof existing.settings === 'string') {
        try {
          return JSON.parse(existing.settings);
        } catch {
          return {};
        }
      }
      return existing.settings;
    })();

    let provisioningResult;
    let targetPlan: string;
    let newSubdomain: string | null = null;
    let newCustomDomain: string | null = null;

    if (isSubdomain(domain)) {
      const slug = extractSlug(domain) || existing.slug;
      targetPlan = 'premium';

      provisioningResult = await provisionSubdomain(slug, listingId);

      if (provisioningResult.success) {
        newSubdomain = slug;
      }
    } else {
      targetPlan = 'ultimate';

      provisioningResult = await provisionCustomDomain(domain, listingId);

      if (provisioningResult.success) {
        newCustomDomain = domain;
      }
    }

    if (!provisioningResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: provisioningResult.error || 'Domain provisioning failed',
        },
        { status: 500 }
      );
    }

    const updatedSettings = {
      ...currentSettings,
      ...(newCustomDomain ? { customDomain: newCustomDomain, customDomainVerified: true } : {}),
      ...(provisioningResult.dnsRecordId ? { dnsRecordId: provisioningResult.dnsRecordId } : {}),
    };

    await db
      .prepare(
        `UPDATE properties
         SET settings = ?,
             plan = ?,
             subdomain = CASE WHEN ? IS NOT NULL THEN ? ELSE subdomain END,
             custom_domain = CASE WHEN ? IS NOT NULL THEN ? ELSE custom_domain END,
             domain_verified = 1
         WHERE id = ?`
      )
      .run(
        JSON.stringify(updatedSettings),
        targetPlan,
        newSubdomain,
        newSubdomain,
        newCustomDomain,
        newCustomDomain,
        listingId
      );

    AuditService.log({
      userId: (session as any).user?.id || 'system',
      action: 'domain.provisioned',
      resource: 'property',
      resourceId: listingId,
      details: {
        domain,
        plan: targetPlan,
        dnsRecordId: provisioningResult.dnsRecordId,
        previousPlan: existing.plan,
      },
    });

    return NextResponse.json({
      ok: true,
      listingId,
      domain,
      plan: targetPlan,
      dnsRecordId: provisioningResult.dnsRecordId,
      warning: provisioningResult.error || undefined,
    });
  } catch (err: any) {
    console.error('[Manage Domain API] Error:', err);
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { listingId: string } }) {
  try {
    const session = await requireListingAccess(req, params.listingId, [
      'manager',
      'marketplace_master',
    ]);
    if (isErrorResponse(session)) return session;

    const { listingId } = params;

    const existing = (await db
      .prepare(
        `SELECT id, plan, settings, slug, subdomain, custom_domain
         FROM properties
         WHERE id = ? AND is_active = true`
      )
      .get(listingId)) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const settings = (() => {
      if (!existing.settings) return {};
      if (typeof existing.settings === 'string') {
        try {
          return JSON.parse(existing.settings);
        } catch {
          return {};
        }
      }
      return existing.settings;
    })();

    const dnsRecordId = (settings as any).dnsRecordId as string | undefined;
    const customDomain =
      existing.custom_domain || ((settings as any).customDomain as string | undefined);
    const subdomain = existing.subdomain;

    if (customDomain) {
      await removeDomainProvisioning(customDomain, dnsRecordId);
    } else if (subdomain) {
      await removeSubdomainProvisioning(subdomain, dnsRecordId);
    }

    await db
      .prepare(
        `UPDATE properties
         SET settings = ?,
             custom_domain = NULL,
             subdomain = NULL,
             domain_verified = 0,
             plan = 'basic'
         WHERE id = ?`
      )
      .run(JSON.stringify({}), listingId);

    AuditService.log({
      userId: (session as any).user?.id || 'system',
      action: 'domain.removed',
      resource: 'property',
      resourceId: listingId,
      details: { customDomain, subdomain },
    });

    return NextResponse.json({ ok: true, listingId });
  } catch (err: any) {
    console.error('[Manage Domain API] Error:', err);
    return errorResponse(err);
  }
}
