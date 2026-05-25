-- Migration: 011_add_perf_indexes
-- Description: Add performance indexes for high-traffic query paths (PH1-003).
--   marketplace_bookings: guest_email + status for booking lookups
--   audit_logs: created_at for time-range queries
--   sessions: user_id for session lookups
-- Depends on: 010_marketplace_settings (for schema_migrations ordering)

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_guest_email
  ON marketplace_bookings(guest_email);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_status
  ON marketplace_bookings(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions(user_id);
