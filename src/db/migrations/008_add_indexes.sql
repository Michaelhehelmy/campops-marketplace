-- Migration: 008_add_indexes
-- Description: Add database indexes for critical query paths (PH1-003).
--   properties, property_staff, stripe_connect_accounts, commission tables,
--   reservations, user_roles, plugin_assets, property_plugins, marketplace_bookings,
--   plugin_analytics, audit_logs, and compound index improvements.
-- Depends on: 001_core_posts (schema_migrations table)
-- PostgreSQL compat notes:
--   Partial indexes with WHERE are supported in PG, but WHERE clause syntax
--   is identical. All CREATE INDEX statements use IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS idx_properties_owner_id
  ON properties(owner_id);

CREATE INDEX IF NOT EXISTS idx_properties_is_active
  ON properties(is_active);

CREATE INDEX IF NOT EXISTS idx_properties_is_active_subdomain
  ON properties(is_active, subdomain)
  WHERE subdomain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_created_at
  ON properties(created_at);

CREATE INDEX IF NOT EXISTS idx_property_staff_property_user
  ON property_staff(property_id, user_id);

CREATE INDEX IF NOT EXISTS idx_property_staff_user_id
  ON property_staff(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_property_id
  ON stripe_connect_accounts(property_id);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_stripe_account_id
  ON stripe_connect_accounts(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_commission_rates_property_id
  ON commission_rates(property_id);

CREATE INDEX IF NOT EXISTS idx_commission_rates_active
  ON commission_rates(is_active);

CREATE INDEX IF NOT EXISTS idx_commission_tx_property_id
  ON commission_transactions(property_id);

CREATE INDEX IF NOT EXISTS idx_commission_tx_booking_id
  ON commission_transactions(booking_id);

CREATE INDEX IF NOT EXISTS idx_commission_tx_created_at
  ON commission_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_property_id
  ON marketplace_bookings(property_id);

CREATE INDEX IF NOT EXISTS idx_plugin_assets_plugin_active
  ON plugin_assets(plugin_name, is_active);

CREATE INDEX IF NOT EXISTS idx_property_plugins_property_id
  ON property_plugins(property_id);

CREATE INDEX IF NOT EXISTS idx_reservations_property_id
  ON reservations(property_id);

CREATE INDEX IF NOT EXISTS idx_reservations_property_status
  ON reservations(property_id, status);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id
  ON reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_created_at
  ON reservations(created_at);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role
  ON user_roles(user_id, role);

CREATE INDEX IF NOT EXISTS idx_build_queue_status_created
  ON build_queue(status, created_at);

CREATE INDEX IF NOT EXISTS idx_plugin_submissions_status_submitted
  ON plugin_submissions(status, submitted_at);

CREATE INDEX IF NOT EXISTS idx_plugin_analytics_plugin
  ON plugin_analytics(plugin_name);

CREATE INDEX IF NOT EXISTS idx_plugin_analytics_property
  ON plugin_analytics(property_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_property_id
  ON audit_logs(property_id);
