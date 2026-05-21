-- Rollback: 004_site_plugins
-- Removes the columns added to property_plugins by 004_site_plugins.sql.
--
-- PostgreSQL:
-- ALTER TABLE property_plugins DROP COLUMN IF EXISTS activated_at;
-- ALTER TABLE property_plugins DROP COLUMN IF EXISTS activated_by;
-- ALTER TABLE property_plugins DROP COLUMN IF EXISTS version;

-- SQLite (3.35+):
ALTER TABLE property_plugins DROP COLUMN IF EXISTS version;
ALTER TABLE property_plugins DROP COLUMN IF EXISTS activated_by;
ALTER TABLE property_plugins DROP COLUMN IF EXISTS activated_at;
