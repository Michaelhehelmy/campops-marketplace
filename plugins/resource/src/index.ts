import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { registerRoutes } from './routes/index.js';

/**
 * Resource Plugin
 * ───────────────
 * Manages marketplace listings with public search, detail pages,
 * master CRUD operations, and admin editing capabilities.
 *
 * Plugin ID: resource
 * Table:     plugin_resource_listings
 *
 * Routes:
 *   GET  /api/p/resource/listings           – public search
 *   GET  /api/p/resource/listings/:slug     – public detail
 *   POST /api/p/resource/master/listings    – master create
 *   PATCH /api/p/resource/master/listings/:id – master update
 *   PATCH /api/p/resource/manage/listings/:id – admin update (tenant-scoped)
 *
 * Hooks:
 *   LISTING_CREATED, LISTING_UPDATED
 *
 * UI Slots:
 *   public.homepage, public.search, public.listing-detail,
 *   master.listings, manage.property
 */
export default async function init(api: PluginAPI) {
  api.logger.info('resource: initializing');

  // ── 1. Database ────────────────────────────────────────────────────────────
  await api.db.createTable(
    'listings',
    `
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    location    TEXT,
    tier        TEXT DEFAULT 'basic',
    images      TEXT,
    is_active   INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 0,
    metadata    TEXT,
    created_at  TEXT,
    updated_at  TEXT
    `
  );

  // ── 2. Routes ──────────────────────────────────────────────────────────────
  registerRoutes(api);

  // ── 3. UI Slots ────────────────────────────────────────────────────────────
  api.ui.addSlotComponent('public.homepage', 'resource:FeaturedListings');
  api.ui.addSlotComponent('public.search', 'resource:SearchBar');
  api.ui.addSlotComponent('public.listing-detail', 'resource:ListingDetail');
  api.ui.addSlotComponent('master.listings', 'resource:MasterListingsTable');
  api.ui.addSlotComponent('manage.property', 'resource:AdminEditForm');

  // ── 4. Hooks ───────────────────────────────────────────────────────────────
  api.hooks.registerHook(
    'LISTING_CREATED',
    async (data: { listingId: string; tenantId: string; title: string }) => {
      api.logger.info('LISTING_CREATED hook fired', data);
      return data;
    },
    10
  );

  api.hooks.registerHook(
    'LISTING_UPDATED',
    async (data: { listingId: string; tenantId: string; changes: Record<string, unknown> }) => {
      api.logger.info('LISTING_UPDATED hook fired', data);
      return data;
    },
    10
  );

  api.hooks.registerHook(
    'PROPERTY_REGISTERED',
    async (data: {
      propertyId: string;
      title: string;
      slug: string;
      ownerEmail: string;
      tier: string;
    }) => {
      api.logger.info(`Processing new property registration for ${data.slug}`);

      const userId = crypto.randomUUID();

      // 1. Create Property in Core
      await api.db.execute(
        `INSERT INTO properties (id, slug, name, status, created_at, updated_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [data.propertyId, data.slug, data.title]
      );

      // 2. Create User (if doesn't exist)
      const existingUser = await api.db.queryOne('SELECT id FROM users WHERE email = ?', [
        data.ownerEmail,
      ]);
      const targetUserId = existingUser ? existingUser.id : userId;

      if (!existingUser) {
        await api.db.execute(
          `INSERT INTO users (id, name, email, emailVerified, image) VALUES (?, ?, ?, CURRENT_TIMESTAMP, null)`,
          [targetUserId, data.ownerEmail.split('@')[0], data.ownerEmail]
        );
        // By default, a new user is 'guest' globally, but they get 'admin' on this property
        await api.db.execute(`INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`, [
          crypto.randomUUID(),
          targetUserId,
          'guest',
        ]);
      }

      // 3. Create Property Staff link
      await api.db.execute(
        `INSERT INTO property_staff (id, property_id, user_id, role) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), data.propertyId, targetUserId, 'admin']
      );

      // 4. Activate the listing
      await api.db.execute(`UPDATE plugin_resource_listings SET is_active = 1 WHERE id = ?`, [
        data.propertyId,
      ]);

      // 5. Enable default plugins (booking, resource)
      await api.db.execute(
        `INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), data.propertyId, 'booking', 1]
      );
      await api.db.execute(
        `INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), data.propertyId, 'resource', 1]
      );

      api.logger.info(`Property ${data.slug} fully registered and activated.`);
      return data;
    },
    10
  );

  api.logger.info('resource: ready');
}
