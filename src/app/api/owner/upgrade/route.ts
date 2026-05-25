import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

const VALID_PLANS = ['premium', 'ultimate'] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { siteId, newPlan, subdomain, customDomain } = body;

    if (!siteId || !newPlan) {
      return NextResponse.json({ error: 'siteId and newPlan are required' }, { status: 400 });
    }

    if (!VALID_PLANS.includes(newPlan)) {
      return NextResponse.json({ error: `Invalid plan: ${newPlan}` }, { status: 400 });
    }

    const property = (await db
      .prepare('SELECT id, owner_id, plan FROM properties WHERE id = ? AND is_active = true')
      .get(siteId)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { user } = session;
    const staffRecord = (await db
      .prepare('SELECT role FROM property_staff WHERE property_id = ? AND user_id = ?')
      .get(siteId, user.id)) as any;

    const isOwner = property.owner_id === user.id;
    const isManager =
      staffRecord && (staffRecord.role === 'manager' || staffRecord.role === 'master');
    if (!isOwner && !isManager && (user as any).role !== 'master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentPlan = property.plan || 'basic';
    const planOrder = { basic: 0, premium: 1, ultimate: 2 };
    if ((planOrder as any)[newPlan] <= (planOrder as any)[currentPlan]) {
      return NextResponse.json({ error: 'Cannot downgrade plan' }, { status: 400 });
    }

    const updateFields: Record<string, any> = { plan: newPlan };
    if (newPlan === 'premium') {
      if (!subdomain || !subdomain.trim()) {
        return NextResponse.json(
          { error: 'subdomain is required for Premium plan' },
          { status: 400 }
        );
      }
      const cleanSub = subdomain
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');
      if (!cleanSub) {
        return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
      }
      const existing = (await db
        .prepare('SELECT id FROM properties WHERE subdomain = ? AND id != ?')
        .get(cleanSub, siteId)) as any;
      if (existing) {
        return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });
      }
      updateFields.subdomain = cleanSub;
    }

    if (newPlan === 'ultimate') {
      if (customDomain && customDomain.trim()) {
        const cleanDomain = customDomain
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '');
        if (!cleanDomain.includes('.')) {
          return NextResponse.json({ error: 'Invalid custom domain' }, { status: 400 });
        }
        const existing = (await db
          .prepare('SELECT id FROM properties WHERE custom_domain = ? AND id != ?')
          .get(cleanDomain, siteId)) as any;
        if (existing) {
          return NextResponse.json({ error: 'Custom domain already in use' }, { status: 409 });
        }
        updateFields.custom_domain = cleanDomain;
        updateFields.domain_verified = 0;
      }
      if (currentPlan === 'basic' && !subdomain) {
        updateFields.subdomain = siteId;
      }
    }

    const setClauses = Object.keys(updateFields)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = Object.values(updateFields);
    values.push(siteId);

    db.prepare(`UPDATE properties SET ${setClauses} WHERE id = ?`).run(...values);

    return NextResponse.json({
      ok: true,
      plan: newPlan,
      subdomain: updateFields.subdomain || null,
      customDomain: updateFields.custom_domain || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upgrade failed' }, { status: 500 });
  }
}
