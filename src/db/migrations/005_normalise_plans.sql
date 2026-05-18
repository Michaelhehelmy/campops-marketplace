-- Migration: 005_normalise_plans
-- Description: Normalise legacy plan identifiers across properties and sites tables.
--   'subdomain'     → 'premium'
--   'custom_domain' → 'ultimate'
-- Rows already on 'basic', 'premium', or 'ultimate' are untouched (WHERE guard).
-- Depends on: 001_core_posts (schema_migrations table)

UPDATE properties
SET plan = 'premium'
WHERE plan = 'subdomain';

UPDATE properties
SET plan = 'ultimate'
WHERE plan = 'custom_domain';

UPDATE sites
SET plan = 'premium'
WHERE plan = 'subdomain';

UPDATE sites
SET plan = 'ultimate'
WHERE plan = 'custom_domain';
