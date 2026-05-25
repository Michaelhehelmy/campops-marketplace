import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { randomUUID } from 'crypto';
import {
  ListingSearchSchema,
  CreateListingSchema,
  MasterUpdateListingSchema,
  AdminUpdateListingSchema,
  RegisterPropertySchema,
} from '../schemas.js';

const TABLE = 'plugin_resource_listings';

/** Shared JSON helper */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Zod parse error → 400 */
function validationError(issues: { path: any[]; message: string }[]): Response {
  return json(
    {
      error: 'Validation error',
      issues: issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    },
    400
  );
}

/**
 * Register all resource plugin routes onto the PluginAPI.
 *
 * Route prefix conventions:
 *   /api/p/resource/*         – public (no auth)
 *   /api/p/resource/master/*  – master-only
 *   /api/p/resource/manage/*  – tenant-admin
 */
export function registerRoutes(api: PluginAPI) {
  // ── GET /api/public/search ──────────────────────────────────────────────────
  // Backward-compatible public search for properties (core table)
  api.registerRoute('/api/public/search', {
    GET: async (req: Request) => {
      try {
        const url = new URL(req.url);
        const destination = url.searchParams.get('destination');
        const checkIn = url.searchParams.get('checkIn');
        const checkOut = url.searchParams.get('checkOut');

        let sql = 'SELECT * FROM properties WHERE is_active = 1';
        const params: any[] = [];

        if (destination) {
          sql += ' AND (name LIKE ? OR city LIKE ? OR country LIKE ?)';
          params.push(`%${destination}%`, `%${destination}%`, `%${destination}%`);
        }

        const properties = await api.db.query(sql, params);

        const enhancedProperties = (properties as any[]).map((p: any) => ({
          ...p,
          displayMinPrice: p.min_price_per_night || 100,
          displayCurrency: p.currency_code || 'USD',
          availableRoomTypes: [
            {
              id: `rt-${p.id}-1`,
              name: 'Standard Tent',
              price: p.min_price_per_night || 100,
              displayPrice: p.min_price_per_night || 100,
              displayCurrency: p.currency_code || 'USD',
              capacity: 2,
              remaining: 5,
            },
          ],
        }));

        return json({
          properties: enhancedProperties,
          totalCount: enhancedProperties.length,
          checkIn,
          checkOut,
          nights: 5,
        });
      } catch (err: any) {
        return json({ error: err.message || 'Database error' }, 500);
      }
    },
  });

  // ── GET /api/p/resource/listings ────────────────────────────────────────────
  // Public search: accepts search, location, tier, page, limit query params.
  api.registerRoute('/api/p/resource/listings', {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const raw = Object.fromEntries(url.searchParams.entries());
      const parsed = ListingSearchSchema.safeParse(raw);
      if (!parsed.success) return validationError(parsed.error.issues);

      const { search, location, tier, page, limit } = parsed.data;
      const offset = (page - 1) * limit;

      let sql = `SELECT * FROM ${TABLE} WHERE is_active = 1`;
      const params: unknown[] = [];

      if (search) {
        sql += ` AND (title LIKE ? OR description LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      if (location) {
        sql += ` AND location LIKE ?`;
        params.push(`%${location}%`);
      }
      if (tier) {
        sql += ` AND tier = ?`;
        params.push(tier);
      }

      sql += ` ORDER BY is_featured DESC, created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const listings = await api.db.query(sql, params as any[]);
      return json({ listings, page, limit });
    },
  });

  // ── GET /api/p/resource/listings/:slug ──────────────────────────────────────
  // Public detail: returns 404 if listing is inactive or not found.
  api.registerRoute('/api/p/resource/listings/:slug', {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      // Slug is injected as :slug query param by the catch-all route
      const slug = url.searchParams.get(':slug') ?? url.pathname.split('/').pop();
      if (!slug) return json({ error: 'Slug is required' }, 400);

      const listing = await api.db.queryOne(
        `SELECT * FROM ${TABLE} WHERE slug = ? AND is_active = 1`,
        [slug]
      );
      if (!listing) return json({ error: 'Listing not found' }, 404);
      return json({ listing });
    },
  });

  // ── POST /api/p/resource/master/listings ────────────────────────────────────
  // Master creates a new listing.
  api.registerRoute('/api/p/resource/master/listings', {
    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session || !['master', 'marketplace_master'].includes(session.user.role)) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const body = await req.json().catch(() => null);
      if (!body) return json({ error: 'Invalid JSON body' }, 400);

      const parsed = CreateListingSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error.issues);

      const data = parsed.data;
      const id = randomUUID();
      const now = new Date().toISOString();

      await api.db.execute(
        `INSERT INTO ${TABLE}
           (id, tenant_id, title, slug, description, location, tier, images, is_active, is_featured, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.tenant_id,
          data.title,
          data.slug,
          data.description ?? null,
          data.location ?? null,
          data.tier,
          data.images ? JSON.stringify(data.images) : null,
          data.is_active ? 1 : 0,
          data.is_featured ? 1 : 0,
          data.metadata ? JSON.stringify(data.metadata) : null,
          now,
          now,
        ]
      );

      const listing = await api.db.queryOne(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);

      await api.hooks.executeHook('LISTING_CREATED', {
        listingId: id,
        tenantId: data.tenant_id,
        title: data.title,
      });

      return json({ ok: true, listing }, 201);
    },
  });

  // ── POST /api/p/resource/register ───────────────────────────────────────────
  // Public property registration flow
  api.registerRoute('/api/p/resource/register', {
    POST: async (req: Request) => {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: 'Invalid JSON body' }, 400);

      const parsed = RegisterPropertySchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error.issues);

      const data = parsed.data;

      // 1. Check if slug exists
      const existingSlug = await api.db.queryOne(`SELECT id FROM ${TABLE} WHERE slug = ?`, [
        data.slug,
      ]);
      if (existingSlug) {
        return json({ error: 'Property slug is already taken' }, 400);
      }

      // 2. We don't have direct access to properties/users table from plugin db cleanly,
      // but we can execute raw sql to the underlying db or call an internal API.
      // Wait, api.db is scoped, but execute can run raw SQL if it bypasses scope?
      // Actually, PluginDatabaseAPI restricts table names.
      // We should use an internal fetch to the core API or the catch-all to handle registration?
      // For now, let's just insert into the plugin_resource_listings table as 'pending'
      // and we emit a hook so the core system can create the property and staff records.

      const id = randomUUID(); // This will serve as both the listing_id and the property_id
      const now = new Date().toISOString();

      await api.db.execute(
        `INSERT INTO ${TABLE}
           (id, tenant_id, title, slug, tier, is_active, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          id, // tenant_id is self
          data.title,
          data.slug,
          data.tier,
          0, // is_active = false (pending approval)
          data.customDomain ? JSON.stringify({ customDomain: data.customDomain }) : null,
          now,
          now,
        ]
      );

      // Emit hook for core to handle tenant setup and email invitation
      await api.hooks.executeHook('PROPERTY_REGISTERED', {
        propertyId: id,
        title: data.title,
        slug: data.slug,
        ownerEmail: data.email,
        tier: data.tier,
        customDomain: data.customDomain,
      });

      return json(
        {
          ok: true,
          message: 'Registration submitted successfully. Please check your email.',
          listingId: id,
        },
        201
      );
    },
  });

  // ── PATCH /api/p/resource/master/listings/:id ───────────────────────────────
  // Master updates any field on any listing.
  api.registerRoute('/api/p/resource/master/listings/:id', {
    PATCH: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session || !['master', 'marketplace_master'].includes(session.user.role)) {
        return json({ error: 'Unauthorized' }, 401);
      }

      const url = new URL(req.url);
      const id = url.searchParams.get(':id') ?? url.pathname.split('/').pop();
      if (!id) return json({ error: 'id is required' }, 400);

      const body = await req.json().catch(() => null);
      if (!body) return json({ error: 'Invalid JSON body' }, 400);

      const parsed = MasterUpdateListingSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error.issues);

      const changes = parsed.data;
      if (Object.keys(changes).length === 0) {
        return json({ error: 'No fields to update' }, 400);
      }

      // Check listing exists
      const existing = await api.db.queryOne(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
      if (!existing) return json({ error: 'Listing not found' }, 404);

      // Build SET clause
      const setClauses: string[] = [];
      const params: unknown[] = [];

      if (changes.tenant_id !== undefined) {
        setClauses.push('tenant_id = ?');
        params.push(changes.tenant_id);
      }
      if (changes.title !== undefined) {
        setClauses.push('title = ?');
        params.push(changes.title);
      }
      if (changes.slug !== undefined) {
        setClauses.push('slug = ?');
        params.push(changes.slug);
      }
      if (changes.description !== undefined) {
        setClauses.push('description = ?');
        params.push(changes.description);
      }
      if (changes.location !== undefined) {
        setClauses.push('location = ?');
        params.push(changes.location);
      }
      if (changes.tier !== undefined) {
        setClauses.push('tier = ?');
        params.push(changes.tier);
      }
      if (changes.images !== undefined) {
        setClauses.push('images = ?');
        params.push(JSON.stringify(changes.images));
      }
      if (changes.is_active !== undefined) {
        setClauses.push('is_active = ?');
        params.push(changes.is_active ? 1 : 0);
      }
      if (changes.is_featured !== undefined) {
        setClauses.push('is_featured = ?');
        params.push(changes.is_featured ? 1 : 0);
      }
      if (changes.metadata !== undefined) {
        setClauses.push('metadata = ?');
        params.push(JSON.stringify(changes.metadata));
      }

      setClauses.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      await api.db.execute(
        `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = ?`,
        params as any[]
      );

      const updated = await api.db.queryOne(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);

      await api.hooks.executeHook('LISTING_UPDATED', {
        listingId: id,
        tenantId: updated?.tenant_id,
        changes,
      });

      return json({ ok: true, listing: updated });
    },
  });

  // ── PATCH /api/p/resource/manage/listings/:id ───────────────────────────────
  // Tenant-admin updates limited fields; must match tenant_id.
  api.registerRoute('/api/p/resource/manage/listings/:id', {
    PATCH: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return json({ error: 'Unauthorized' }, 401);

      const url = new URL(req.url);
      const id = url.searchParams.get(':id') ?? url.pathname.split('/').pop();
      if (!id) return json({ error: 'id is required' }, 400);

      // Tenant ID provided via X-Tenant-Id header or query param
      const tenantId = req.headers.get('x-tenant-id') ?? url.searchParams.get('tenant_id');
      if (!tenantId) return json({ error: 'Tenant ID is required' }, 401);

      const body = await req.json().catch(() => null);
      if (!body) return json({ error: 'Invalid JSON body' }, 400);

      const parsed = AdminUpdateListingSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error.issues);

      const changes = parsed.data;
      if (Object.keys(changes).length === 0) {
        return json({ error: 'No fields to update' }, 400);
      }

      // Verify listing exists and belongs to this tenant
      const existing = await api.db.queryOne(
        `SELECT * FROM ${TABLE} WHERE id = ? AND tenant_id = ?`,
        [id, tenantId]
      );
      if (!existing) return json({ error: 'Listing not found or access denied' }, 404);

      // Build SET clause
      const setClauses: string[] = [];
      const params: unknown[] = [];

      if (changes.title !== undefined) {
        setClauses.push('title = ?');
        params.push(changes.title);
      }
      if (changes.description !== undefined) {
        setClauses.push('description = ?');
        params.push(changes.description);
      }
      if (changes.location !== undefined) {
        setClauses.push('location = ?');
        params.push(changes.location);
      }
      if (changes.tier !== undefined) {
        setClauses.push('tier = ?');
        params.push(changes.tier);
      }
      if (changes.images !== undefined) {
        setClauses.push('images = ?');
        params.push(JSON.stringify(changes.images));
      }
      if (changes.is_active !== undefined) {
        setClauses.push('is_active = ?');
        params.push(changes.is_active ? 1 : 0);
      }
      if (changes.metadata !== undefined) {
        setClauses.push('metadata = ?');
        params.push(JSON.stringify(changes.metadata));
      }

      setClauses.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      params.push(tenantId);

      await api.db.execute(
        `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
        params as any[]
      );

      const updated = await api.db.queryOne(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);

      await api.hooks.executeHook('LISTING_UPDATED', {
        listingId: id,
        tenantId,
        changes,
      });

      return json({ ok: true, listing: updated });
    },
  });
}
