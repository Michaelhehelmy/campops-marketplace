import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// --- Better Auth Tables ---

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  password: text('password'),
  role: text('role').default('guest'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  token: text('token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

// --- Core Framework Tables ---

export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull(),
  permissions: text('permissions'),
});

export const availablePlugins = sqliteTable('available_plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name'),
  description: text('description'),
  category: text('category'),
  isOfficial: integer('is_official', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  manifest: text('manifest'),
  entryPointUrl: text('entry_point_url'),
  configSchema: text('config_schema'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

/**
 * tenants — generic multi-tenant entity.
 *
 * A tenant is any registered entity on the platform (a shop, a property,
 * a restaurant, a service provider, etc.).  Domain-specific fields (rooms,
 * amenities, price-per-night …) belong in plugin-owned tables, NOT here.
 *
 * Previously called `properties`.  All SQL in the codebase that still uses the
 * table name `properties` continues to work because the underlying SQLite table
 * is still named `properties` for backward-compatibility with existing data and
 * tests.  New code should use the Drizzle symbol `tenants`.
 */
export const tenants = sqliteTable('properties', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  city: text('city'),
  country: text('country'),
  settings: text('settings'),
  branding: text('branding'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  ownerId: text('owner_id').references(() => users.id),
  subdomain: text('subdomain'),
  plan: text('plan').default('basic'),
  primaryImage: text('primary_image'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  rating: real('rating'),
  amenities: text('amenities'),
  pricePerNight: integer('price_per_night'),
  minPricePerNight: integer('min_price_per_night'),
  currencyCode: text('currency_code').default('USD'),
  featuredOrder: integer('featured_order'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

/** Backward-compat alias so existing imports of `properties` still compile. */
export const properties = tenants;

/**
 * tenantStaff — staff/user role assignments scoped to a tenant.
 * Previously called `property_staff`.
 */
export const tenantStaff = sqliteTable('property_staff', {
  id: text('id').primaryKey(),
  tenantId: text('property_id')
    .references(() => tenants.id)
    .notNull(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  role: text('role').notNull(),
});

/** Backward-compat alias. */
export const propertyStaff = tenantStaff;

/**
 * tenantPlugins — maps which plugins are enabled for which tenant.
 * Previously called `property_plugins`.
 */
export const tenantPlugins = sqliteTable('property_plugins', {
  id: text('id').primaryKey(),
  tenantId: text('property_id')
    .references(() => tenants.id)
    .notNull(),
  pluginName: text('plugin_name').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  config: text('config'),
});

/** Backward-compat alias. */
export const propertyPlugins = tenantPlugins;

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  fullName: text('full_name'),
  bio: text('bio'),
  phone: text('phone'),
});

// ---------------------------------------------------------------------------
// Phase 1 — Core WordPress-like schema
// ---------------------------------------------------------------------------

/**
 * sites — one row per tenant in the new core framework.
 * Mirrors `properties` for backward-compat; use this for all new code.
 */
export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('basic'),
  subdomain: text('subdomain'),
  customDomain: text('custom_domain'),
  domainVerified: integer('domain_verified', { mode: 'boolean' }).default(false),
  ownerId: text('owner_id'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

/**
 * posts — universal content object. Every listing, booking, room, etc. is a post.
 * Domain-specific fields live in postmeta (EAV).
 */
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  siteId: text('site_id').notNull(),
  postType: text('post_type').notNull(),
  postStatus: text('post_status').notNull().default('publish'),
  postSlug: text('post_slug'),
  postTitle: text('post_title').notNull().default(''),
  postContent: text('post_content'),
  authorId: text('author_id'),
  parentId: text('parent_id'),
  menuOrder: integer('menu_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

/**
 * postmeta — key/value attributes for any post.
 * All domain-specific fields (price, capacity, check_in, etc.) live here.
 */
export const postmeta = sqliteTable('postmeta', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  postId: text('post_id').notNull(),
  metaKey: text('meta_key').notNull(),
  metaValue: text('meta_value'),
});

/**
 * options — per-site key/value store (equivalent to WordPress wp_options).
 * Used for branding tokens, active theme, feature flags, etc.
 */
export const options = sqliteTable('options', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  siteId: text('site_id').notNull(),
  optionName: text('option_name').notNull(),
  optionValue: text('option_value'),
  autoload: integer('autoload', { mode: 'boolean' }).notNull().default(false),
});

/**
 * availableThemes — registry of installed themes.
 * Active theme per site is stored as options(site_id, 'active_theme').
 */
export const availableThemes = sqliteTable('available_themes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  version: text('version').notNull().default('1.0.0'),
  author: text('author'),
  screenshotUrl: text('screenshot_url'),
  themePath: text('theme_path').notNull(),
  planRequirement: text('plan_requirement').notNull().default('basic'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  manifest: text('manifest'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ---------------------------------------------------------------------------
// NOTE: The following tables have been REMOVED from the core schema because
// they encode domain-specific (hospitality / booking) concepts.  They are now
// owned by their respective plugins:
//
//   marketplace_bookings  → booking / financial-ops plugin
//   commission_rates      → financial-ops plugin
//   reservations          → booking plugin
//   room_types            → booking plugin
//
// Plugin-owned tables are created at runtime via `api.db.createTable()` in
// each plugin's `init()` function.  The core `resetMockStore()` in db.ts still
// creates these tables in the test in-memory database so that existing
// integration tests continue to pass without modification.
// ---------------------------------------------------------------------------
