-- Migration: 013_add_core_indexes
-- Description: Performance indexes for high-traffic query paths on core tables
-- Depends on: 012_tenant_pages

-- marketplace_bookings: property lookups + checkout status filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_property
  ON marketplace_bookings(property_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_created
  ON marketplace_bookings(created_at);

-- properties: owner queries + active + featured sorting
CREATE INDEX IF NOT EXISTS idx_properties_owner
  ON properties(owner_id);

CREATE INDEX IF NOT EXISTS idx_properties_active
  ON properties(is_active);

CREATE INDEX IF NOT EXISTS idx_properties_featured
  ON properties(is_featured);

-- sites: owner + active queries
CREATE INDEX IF NOT EXISTS idx_sites_owner
  ON sites(owner_id);

CREATE INDEX IF NOT EXISTS idx_sites_active
  ON sites(is_active);

-- posts: site + type + status combo (most common query path)
CREATE INDEX IF NOT EXISTS idx_posts_site_type_status
  ON posts(site_id, post_type, post_status);

CREATE INDEX IF NOT EXISTS idx_posts_parent
  ON posts(parent_id);

-- postmeta: post lookups
CREATE INDEX IF NOT EXISTS idx_postmeta_post
  ON postmeta(post_id);

-- options: site+autoload (bulk load on every request)
CREATE INDEX IF NOT EXISTS idx_options_site_autoload
  ON options(site_id, autoload);

-- audit_logs: user + time range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource, resource_id);

-- build_queue: site + status (worker polling)
CREATE INDEX IF NOT EXISTS idx_build_queue_site_status
  ON build_queue(site_id, status);

-- accounts: user lookups
CREATE INDEX IF NOT EXISTS idx_accounts_user
  ON accounts(user_id);

-- verifications: expiry sweep
CREATE INDEX IF NOT EXISTS idx_verifications_expires
  ON verifications(expires_at);

-- property_plugins: property + plugin lookups
CREATE INDEX IF NOT EXISTS idx_property_plugins_property
  ON property_plugins(property_id, plugin_name);

-- plugin_analytics: property + event queries
CREATE INDEX IF NOT EXISTS idx_plugin_analytics_property_event
  ON plugin_analytics(property_id, event_type);

-- commission_rates: property lookups
CREATE INDEX IF NOT EXISTS idx_commission_rates_property
  ON commission_rates(property_id);

-- stripe_connect_accounts: property + account type
CREATE INDEX IF NOT EXISTS idx_stripe_connect_property
  ON stripe_connect_accounts(property_id, stripe_account_type);

-- marketplace_settings: id lookup (singleton table uses fixed id)
CREATE INDEX IF NOT EXISTS idx_marketplace_settings_id
  ON marketplace_settings(id);
