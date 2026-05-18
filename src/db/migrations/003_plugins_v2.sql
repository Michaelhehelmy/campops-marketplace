-- Migration: 003_plugins_v2
-- Description: Extend available_plugins with Phase 6 manifest columns.
-- Depends on: 001_core_posts (schema_migrations table)
--
-- Adds:
--   campops_version  – minimum CampOps engine version required
--   post_types       – JSON array of custom post type definitions registered by this plugin
--   plan_requirement – minimum plan required to install (basic | premium | ultimate)
--   zip_url          – optional URL to a distributable zip package
--   review_status    – approval state (pending | approved | rejected)
--
-- CREATE TABLE IF NOT EXISTS ensures fresh DBs have the table before ALTER runs.
-- On existing DBs the CREATE is a no-op; on fresh migration-only DBs it bootstraps the table.

CREATE TABLE IF NOT EXISTS available_plugins (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  display_name     TEXT,
  description      TEXT,
  category         TEXT,
  is_official      INTEGER,
  is_active        INTEGER,
  manifest         TEXT,
  entry_point_url  TEXT,
  config_schema    TEXT,
  version          TEXT,
  updated_at       INTEGER
);

ALTER TABLE available_plugins ADD COLUMN campops_version TEXT;
ALTER TABLE available_plugins ADD COLUMN post_types TEXT;
ALTER TABLE available_plugins ADD COLUMN plan_requirement TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE available_plugins ADD COLUMN zip_url TEXT;
ALTER TABLE available_plugins ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS idx_available_plugins_plan ON available_plugins(plan_requirement);
CREATE INDEX IF NOT EXISTS idx_available_plugins_review ON available_plugins(review_status);
