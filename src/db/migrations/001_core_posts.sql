-- Migration: 001_core_posts
-- Description: Add sites, posts, postmeta, options tables — the universal EAV core layer.
-- Depends on: (none — additive only, existing tables untouched)
-- PostgreSQL compat notes:
--   Replace: DEFAULT (unixepoch())   → DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
--   The rest of this file is PostgreSQL-compatible.

-- ---------------------------------------------------------------------------
-- sites
-- One row per tenant. Mirrors the `properties` table but is the authoritative
-- source for the new core framework. Properties rows are kept for backward
-- compat; a data migration (task 1.6) will copy them here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sites (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'basic',
  subdomain   TEXT,
  custom_domain TEXT,
  domain_verified INTEGER NOT NULL DEFAULT 0,
  owner_id    TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL;

-- ---------------------------------------------------------------------------
-- posts
-- The universal content object. Replaces domain-specific tables such as
-- plugin_booking_bookings, plugin_resource_listings, rooms, etc.
-- Every piece of content — listing, booking, room, category — is a post.
-- Domain-specific attributes live in postmeta (EAV).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  post_type   TEXT NOT NULL,
  post_status TEXT NOT NULL DEFAULT 'publish',
  post_slug   TEXT,
  post_title  TEXT NOT NULL DEFAULT '',
  post_content TEXT,
  author_id   TEXT,
  parent_id   TEXT REFERENCES posts(id) ON DELETE SET NULL,
  menu_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_posts_site_type ON posts(site_id, post_type);
CREATE INDEX IF NOT EXISTS idx_posts_site_type_status ON posts(site_id, post_type, post_status);
CREATE INDEX IF NOT EXISTS idx_posts_site_slug ON posts(site_id, post_slug) WHERE post_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(site_id, author_id) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_site_type_slug ON posts(site_id, post_type, post_slug)
  WHERE post_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- postmeta
-- Key-value store for post attributes. All domain-specific fields (price,
-- capacity, check_in, etc.) live here, never in the posts table itself.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS postmeta (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  meta_key    TEXT NOT NULL,
  meta_value  TEXT
);

-- Fast look-up by post + key (the most common query pattern)
CREATE INDEX IF NOT EXISTS idx_postmeta_post_key ON postmeta(post_id, meta_key);
-- Allow scanning all posts in a site with a specific meta key/value
CREATE INDEX IF NOT EXISTS idx_postmeta_key_value ON postmeta(meta_key, meta_value);

-- ---------------------------------------------------------------------------
-- options
-- Site-scoped key-value store (equivalent to WordPress wp_options).
-- Used for per-site settings, branding tokens, active theme, etc.
-- autoload = 1 means the value is loaded on every bootstrap.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT NOT NULL,
  option_name TEXT NOT NULL,
  option_value TEXT,
  autoload    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(site_id, option_name)
);

CREATE INDEX IF NOT EXISTS idx_options_site_name ON options(site_id, option_name);
CREATE INDEX IF NOT EXISTS idx_options_autoload ON options(site_id, autoload) WHERE autoload = 1;

-- ---------------------------------------------------------------------------
-- schema_migrations  (created by migration runner if not exists)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
