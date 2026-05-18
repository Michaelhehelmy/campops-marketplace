import { NextRequest, NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db';
import { auth } from '@/lib/auth';
import { planSatisfies } from '@/lib/PluginLoader';
import { doAction } from '@/lib/hooks';

export const dynamic = 'force-dynamic';

const VALID_PLANS = ['basic', 'premium', 'ultimate'] as const;
type Plan = (typeof VALID_PLANS)[number];

/**
 * POST /api/owner/upgrade
 * Body: { siteId, newPlan, subdomain?, customDomain? }
 *
 * Validates:
 *  - User is authenticated and owns the site.
 *  - newPlan is a valid normalised plan name.
 *  - Upgrade direction is forward only (no downgrades via this endpoint).
 *  - premium requires subdomain; ultimate requires customDomain.
 *
 * Fires: core:site:plan_upgraded action.
 */
export async function POST(req: NextRequest) {
  let body: { siteId?: string; newPlan?: string; subdomain?: string; customDomain?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { siteId, newPlan, subdomain, customDomain } = body;

  if (!siteId || !newPlan) {
    return NextResponse.json({ error: 'siteId and newPlan are required' }, { status: 400 });
  }

  if (!VALID_PLANS.includes(newPlan as Plan)) {
    return NextResponse.json(
      { error: `Invalid plan "${newPlan}". Must be one of: ${VALID_PLANS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSqlite();

    const property = db
      .prepare('SELECT id, owner_id, plan, subdomain, custom_domain FROM properties WHERE id = ?')
      .get(siteId) as
      | {
          id: string;
          owner_id: string;
          plan: string;
          subdomain: string | null;
          custom_domain: string | null;
        }
      | undefined;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (property.owner_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentPlan = property.plan;
    if (!planSatisfies(newPlan, currentPlan)) {
      return NextResponse.json(
        {
          error: `Cannot downgrade from "${currentPlan}" to "${newPlan}". Contact support for downgrades.`,
        },
        { status: 422 }
      );
    }

    if (newPlan === currentPlan) {
      return NextResponse.json({ error: 'Site is already on this plan' }, { status: 422 });
    }

    // Plan-specific field requirements
    if (newPlan === 'premium' && !subdomain) {
      return NextResponse.json(
        { error: 'subdomain is required when upgrading to premium' },
        { status: 400 }
      );
    }
    if (newPlan === 'ultimate' && !customDomain) {
      return NextResponse.json(
        { error: 'customDomain is required when upgrading to ultimate' },
        { status: 400 }
      );
    }

    // Apply upgrade
    if (newPlan === 'premium') {
      db.prepare(
        `
        UPDATE properties
        SET plan = 'premium', subdomain = ?
        WHERE id = ?
      `
      ).run(subdomain ?? null, siteId);
    } else if (newPlan === 'ultimate') {
      db.prepare(
        `
        UPDATE properties
        SET plan = 'ultimate', custom_domain = ?, domain_verified = 0
        WHERE id = ?
      `
      ).run(customDomain ?? null, siteId);
    }

    // Also sync to sites table if a matching row exists
    db.prepare(
      `
      UPDATE sites SET plan = ? WHERE slug = (SELECT slug FROM properties WHERE id = ?)
    `
    ).run(newPlan, siteId);

    await doAction('core:site:plan_upgraded', {
      siteId,
      previousPlan: currentPlan,
      newPlan,
      subdomain: subdomain ?? null,
      customDomain: customDomain ?? null,
      actorId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      siteId,
      previousPlan: currentPlan,
      newPlan,
    });
  } catch (err: any) {
    console.error('[Upgrade API] Error:', err);
    return NextResponse.json({ error: err.message || 'Upgrade failed' }, { status: 500 });
  }
}
