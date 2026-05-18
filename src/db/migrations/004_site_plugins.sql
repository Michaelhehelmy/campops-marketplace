-- Migration: 004_site_plugins
-- Description: Extend property_plugins with Phase 6 lifecycle columns.
-- Depends on: 001_core_posts (schema_migrations table)
--
-- Adds:
--   activated_at  – Unix timestamp when this plugin was last activated
--   activated_by  – user_id of the actor who activated it
--   version       – version string at time of activation (snapshot from plugin.json)
--   config        – JSON config blob (column may already exist; IF NOT EXISTS is safe)

CREATE TABLE IF NOT EXISTS property_plugins (
  id          TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  plugin_name TEXT NOT NULL,
  is_enabled  INTEGER,
  config      TEXT,
  installed_version TEXT,
  installed_by TEXT,
  last_disabled_at INTEGER,
  created_at  INTEGER,
  UNIQUE(property_id, plugin_name)
);

ALTER TABLE property_plugins ADD COLUMN activated_at INTEGER;
ALTER TABLE property_plugins ADD COLUMN activated_by TEXT;
ALTER TABLE property_plugins ADD COLUMN version TEXT;
