import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const ALLOWED_BRANDING_FIELDS = [
  'logo',
  'primaryColor',
  'secondaryColor',
  'fontFamily',
  'tagline',
  'contactEmail',
  'contactPhone',
  'address',
  'socialLinks',
  'heroImage',
];

const updatePropertySchema = z.object({
  name: z.string().optional(),
  plan: z.enum(['basic', 'premium', 'ultimate']).optional(),
  subdomain: z.string().nullable().optional(),
}).passthrough();

function sanitizeBranding(body: Record<string, unknown>) {
  const branding: Record<string, unknown> = {};
  for (const key of ALLOWED_BRANDING_FIELDS) {
    if (body[key] !== undefined) {
      branding[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
  }
  return Object.keys(branding).length > 0 ? branding : null;
}

function sanitizeSettings(body: Record<string, unknown>) {
  const allowed = [
    'timezone',
    'currency',
    'unitSystem',
    'bookingLeadDays',
    'cancellationPolicy',
    'checkInTime',
    'checkOutTime',
    'minNightStay',
    'maxNightStay',
    'instantBooking',
    'taxRate',
  ];
  const settings: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      settings[key] = body[key];
    }
  }
  return Object.keys(settings).length > 0 ? settings : null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = (await db
      .prepare('SELECT id, owner_id FROM properties WHERE id = ? AND is_active = true')
      .get(id)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { user } = session;
    const staffRecord = (await db
      .prepare('SELECT role FROM property_staff WHERE property_id = ? AND user_id = ?')
      .get(id, user.id)) as any;

    const isOwner = property.owner_id === user.id;
    const isManager =
      staffRecord && (staffRecord.role === 'manager' || staffRecord.role === 'master');
    if (!isOwner && !isManager && (user as any).role !== 'master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = updatePropertySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      updates.push('name = ?');
      values.push(name);
    }

    if (body.plan !== undefined) {
      updates.push('plan = ?');
      values.push(body.plan);
    }

    if (body.subdomain !== undefined) {
      const cleanSub = String(body.subdomain)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');
      if (body.subdomain !== null && !cleanSub) {
        return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
      }
      if (cleanSub) {
        const existing = (await db
          .prepare('SELECT id FROM properties WHERE subdomain = ? AND id != ?')
          .get(cleanSub, id)) as any;
        if (existing) {
          return NextResponse.json({ error: 'Subdomain already taken' }, { status: 409 });
        }
      }
      updates.push('subdomain = ?');
      values.push(cleanSub || null);
    }

    const branding = sanitizeBranding(body);
    if (branding) {
      const current = (await db
        .prepare('SELECT branding FROM properties WHERE id = ?')
        .get(id)) as any;
      let existingBranding: Record<string, unknown> = {};
      if (current?.branding) {
        existingBranding =
          typeof current.branding === 'string' ? JSON.parse(current.branding) : current.branding;
      }
      const merged = { ...existingBranding, ...branding };
      updates.push('branding = ?');
      values.push(JSON.stringify(merged));
    }

    const settings = sanitizeSettings(body);
    if (settings) {
      const current = (await db
        .prepare('SELECT settings FROM properties WHERE id = ?')
        .get(id)) as any;
      let existingSettings: Record<string, unknown> = {};
      if (current?.settings) {
        existingSettings =
          typeof current.settings === 'string' ? JSON.parse(current.settings) : current.settings;
      }
      const merged = { ...existingSettings, ...settings };
      updates.push('settings = ?');
      values.push(JSON.stringify(merged));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = (await db.prepare('SELECT * FROM properties WHERE id = ?').get(id)) as any;
    const parseJson = (val: unknown) => {
      if (!val) return null;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    };

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      subdomain: updated.subdomain,
      customDomain: updated.custom_domain,
      domainVerified: updated.domain_verified,
      branding: parseJson(updated.branding),
      settings: parseJson(updated.settings),
    });
  } catch (err: any) {
    logger.error('Error updating property:', err);
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
