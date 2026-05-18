-- Migration: 002_themes_registry
-- Description: Add available_themes table for the theme system (Phase 4).
-- Depends on: 001_core_posts (schema_migrations table)

-- ---------------------------------------------------------------------------
-- available_themes
-- Registry of installed themes. Each row corresponds to a directory under
-- themes/ (or a zipped theme package). Active theme per site is stored as
-- options(site_id, 'active_theme') = theme_id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS available_themes (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  description   TEXT,
  version       TEXT NOT NULL DEFAULT '1.0.0',
  author        TEXT,
  screenshot_url TEXT,
  theme_path    TEXT NOT NULL,
  plan_requirement TEXT NOT NULL DEFAULT 'basic',
  is_active     INTEGER NOT NULL DEFAULT 1,
  manifest      TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_available_themes_name ON available_themes(name);
CREATE INDEX IF NOT EXISTS idx_available_themes_active ON available_themes(is_active);
