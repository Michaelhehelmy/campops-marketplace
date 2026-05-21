-- Migration: 007_plugin_submissions
-- Description: Creates the plugin_submissions table for the external developer
--   submission flow. Developers POST to /api/plugins/submit; master admins review
--   via /api/admin/plugins/submissions.
-- Depends on: 001_core_posts (schema_migrations table)
-- PostgreSQL compat notes:
--   Replace: DEFAULT (unixepoch())  → DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
--   TEXT PRIMARY KEY (no DEFAULT needed for UUID) — use gen_random_uuid() if auto-generated

CREATE TABLE IF NOT EXISTS plugin_submissions (
  id            TEXT PRIMARY KEY,
  plugin_id     TEXT NOT NULL,
  submitted_by  TEXT NOT NULL,
  version       TEXT NOT NULL,
  zip_url       TEXT,
  manifest      TEXT,
  review_notes  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  reviewed_by   TEXT,
  submitted_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  reviewed_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_plugin_submissions_plugin_id ON plugin_submissions(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_submissions_status    ON plugin_submissions(status);
CREATE INDEX IF NOT EXISTS idx_plugin_submissions_submitter ON plugin_submissions(submitted_by);
