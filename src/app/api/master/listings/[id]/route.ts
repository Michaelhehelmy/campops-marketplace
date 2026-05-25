import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { AuditService } from '@/lib/audit';

/**
 * GET /api/master/listings/[id]
 *
 * Returns a single listing with its plugin associations.
 * Used by the master admin listing detail page.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const { id } = params;

    const shop = (await db
      .prepare(
        `SELECT
          p.id,
          p.name,
          p.slug,
          p.plan,
          p.is_active,
          p.is_featured,
          p.featured_order,
          p.subdomain,
          p.custom_domain,
          p.owner_id,
          p.created_at,
          p.settings as raw_settings,
          u.email as owner_email,
          pr.full_name as owner_full_name,
          pr.phone as owner_phone,
          (SELECT COUNT(*) FROM property_staff WHERE property_id = p.id) as staff_count
        FROM properties p
        LEFT JOIN users u ON u.id = p.owner_id
        LEFT JOIN profiles pr ON pr.user_id = u.id
        WHERE p.id = ? OR p.slug = ?`
      )
      .get(id, id)) as any;

    if (!shop) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Fetch plugin associations
    const propertyPluginsRaw = (await db
      .prepare(
        `SELECT pp.plugin_name, pp.is_enabled, ap.display_name
         FROM property_plugins pp
         LEFT JOIN available_plugins ap ON ap.name = pp.plugin_name
         WHERE pp.property_id = ?`
      )
      .all(shop.id)) as any[];

    const plugins = (propertyPluginsRaw || []).map((p: any) => ({
      plugin_name: p.plugin_name,
      is_enabled: !!p.is_enabled,
      display_name: p.display_name || p.plugin_name,
    }));

    return NextResponse.json({
      shop: {
        ...shop,
        is_active: !!shop.is_active,
        is_featured: !!shop.is_featured,
        featured_order: shop.featured_order ?? null,
        plugins,
        total_revenue_cents: 0,
        reservations_count: 0,
        plan: shop.plan || 'Standard',
      },
    });
  } catch (err: any) {
    console.error('[Master Listings Detail API] Error:', err);
    return errorResponse(err);
  }
}

/**
 * PUT /api/master/listings/[id]
 *
 * Updates listing configurations — name, slug, plan, domain, branding, owner.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const { id } = params;
    const body = await req.json();
    const { name, slug, plan, isActive, city, country, subdomain, custom_domain, owner_id } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if slug is used by another property
    const existing = await db
      .prepare('SELECT id FROM properties WHERE slug = ? AND id != ?')
      .get(slug, id);
    if (existing) {
      return NextResponse.json(
        { error: 'Slug already in use by another property' },
        { status: 400 }
      );
    }

    // Build dynamic SET clause so only provided fields are updated
    const fields: string[] = [];
    const values: any[] = [];

    fields.push('name = ?');
    values.push(name);
    fields.push('slug = ?');
    values.push(slug);
    fields.push('plan = ?');
    values.push(plan || 'basic');
    fields.push('is_active = ?');
    values.push(isActive ? 1 : 0);
    fields.push('city = ?');
    values.push(city || null);
    fields.push('country = ?');
    values.push(country || null);

    if (subdomain !== undefined) {
      fields.push('subdomain = ?');
      values.push(subdomain || null);
    }
    if (custom_domain !== undefined) {
      fields.push('custom_domain = ?');
      values.push(custom_domain || null);
    }
    if (owner_id !== undefined) {
      fields.push('owner_id = ?');
      values.push(owner_id || null);
    }

    values.push(id);
    await db.prepare(`UPDATE properties SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    AuditService.log({
      userId: (session.user as any).id || 'unknown',
      action: 'property.update',
      resource: 'properties',
      resourceId: id,
      details: {
        updatedFields: Object.fromEntries(fields.map((f, i) => [f.replace(' = ?', ''), values[i]])),
      },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Master Listings Update API] Error:', err);
    return errorResponse(err);
  }
}

/**
 * DELETE /api/master/listings/[id]
 *
 * Hard-deletes a property and its associated data.
 * Only available to marketplace_master role.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const { id } = params;

    const property = (await db
      .prepare('SELECT id, name, slug FROM properties WHERE id = ?')
      .get(id)) as any;

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Delete associated records in order (child tables first)
    await db.prepare('DELETE FROM property_staff WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM property_plugins WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM reservations WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM plugin_booking_rooms WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM plugin_booking_bookings WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM rooms WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM room_types WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM commission_rates WHERE property_id = ?').run(id);
    await db.prepare('DELETE FROM plugin_financial_ops_commissions WHERE property_id = ?').run(id);

    // Delete the property itself
    await db.prepare('DELETE FROM properties WHERE id = ?').run(id);

    AuditService.log({
      userId: (session.user as any).id || 'unknown',
      action: 'property.delete',
      resource: 'properties',
      resourceId: id,
      details: { name: property.name, slug: property.slug },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ ok: true, deleted: property.name });
  } catch (err: any) {
    console.error('[Master Listings Delete API] Error:', err);
    return errorResponse(err);
  }
}

/**
 * PATCH /api/master/listings/[id]
 *
 * Quick actions: activate/deactivate a listing without sending full body.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    const { id } = params;
    const body = await req.json();
    const { action, featured_order } = body;

    if (action === 'activate') {
      await db.prepare('UPDATE properties SET is_active = 1 WHERE id = ?').run(id);
      AuditService.log({
        userId: (session.user as any).id || 'unknown',
        action: 'property.activate',
        resource: 'properties',
        resourceId: id,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });
      return NextResponse.json({ ok: true, is_active: true });
    }
    if (action === 'deactivate') {
      await db.prepare('UPDATE properties SET is_active = 0 WHERE id = ?').run(id);
      AuditService.log({
        userId: (session.user as any).id || 'unknown',
        action: 'property.deactivate',
        resource: 'properties',
        resourceId: id,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });
      return NextResponse.json({ ok: true, is_active: false });
    }

    if (action === 'feature') {
      // Compute next featured_order if not provided
      let order = featured_order;
      if (order == null) {
        const maxRow = (await db
          .prepare(
            'SELECT COALESCE(MAX(featured_order), 0) as max_order FROM properties WHERE is_featured = 1'
          )
          .get()) as any;
        order = (maxRow?.max_order ?? 0) + 1;
      }
      await db
        .prepare('UPDATE properties SET is_featured = 1, featured_order = ? WHERE id = ?')
        .run(order, id);
      AuditService.log({
        userId: (session.user as any).id || 'unknown',
        action: 'property.feature',
        resource: 'properties',
        resourceId: id,
        details: { featured_order: order },
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });
      return NextResponse.json({ ok: true, is_featured: true, featured_order: order });
    }

    if (action === 'unfeature') {
      await db
        .prepare('UPDATE properties SET is_featured = NULL, featured_order = NULL WHERE id = ?')
        .run(id);
      AuditService.log({
        userId: (session.user as any).id || 'unknown',
        action: 'property.unfeature',
        resource: 'properties',
        resourceId: id,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });
      return NextResponse.json({ ok: true, is_featured: false, featured_order: null });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Master Listings Patch API] Error:', err);
    return errorResponse(err);
  }
}
