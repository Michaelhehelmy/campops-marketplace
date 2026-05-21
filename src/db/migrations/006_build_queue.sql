-- Migration: 006_build_queue
-- Description: Creates the build_queue table for tracking per-site asset build jobs.
--   Triggered when a site upgrades to ultimate (requires custom-domain SPA build).
--   Workers poll this table for pending jobs and update status to running/done/failed.
-- Depends on: 001_core_posts (schema_migrations table)
-- PostgreSQL compat notes:
--   Replace: DEFAULT (lower(hex(randomblob(16))))  → DEFAULT gen_random_uuid()::TEXT
--   Replace: DEFAULT (unixepoch())                 → DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER

CREATE TABLE IF NOT EXISTS build_queue (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  triggered_by TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  started_at  INTEGER,
  finished_at INTEGER,
  error       TEXT
);

CREATE INDEX IF NOT EXISTS idx_build_queue_site_id ON build_queue (site_id);
CREATE INDEX IF NOT EXISTS idx_build_queue_status  ON build_queue (status);
