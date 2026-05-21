-- Rollback: 005_normalise_plans
-- Reverts normalised plan values back to the legacy identifiers.
-- Only rows that were migrated (i.e. have no other source of 'premium'/'ultimate')
-- can be reliably reverted — all 'premium' becomes 'subdomain' and
-- all 'ultimate' becomes 'custom_domain'.

UPDATE properties
SET plan = 'subdomain'
WHERE plan = 'premium';

UPDATE properties
SET plan = 'custom_domain'
WHERE plan = 'ultimate';

UPDATE sites
SET plan = 'subdomain'
WHERE plan = 'premium';

UPDATE sites
SET plan = 'custom_domain'
WHERE plan = 'ultimate';
