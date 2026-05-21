-- Rollback: 003_plugins_v2
-- Removes the columns added to available_plugins by 003_plugins_v2.sql.
-- SQLite does not support DROP COLUMN before version 3.35; for older SQLite
-- versions the table must be recreated without those columns.
--
-- Safe approach: recreate the table without the new columns and copy data.
-- For PostgreSQL (production) use plain ALTER TABLE ... DROP COLUMN.

-- PostgreSQL:
-- ALTER TABLE available_plugins DROP COLUMN IF EXISTS campops_version;
-- ALTER TABLE available_plugins DROP COLUMN IF EXISTS post_types;
-- ALTER TABLE available_plugins DROP COLUMN IF EXISTS plan_requirement;
-- ALTER TABLE available_plugins DROP COLUMN IF EXISTS zip_url;
-- ALTER TABLE available_plugins DROP COLUMN IF EXISTS review_status;
-- DROP INDEX IF EXISTS idx_available_plugins_review;
-- DROP INDEX IF EXISTS idx_available_plugins_plan;

-- SQLite (3.35+):
DROP INDEX IF EXISTS idx_available_plugins_review;
DROP INDEX IF EXISTS idx_available_plugins_plan;
ALTER TABLE available_plugins DROP COLUMN IF EXISTS review_status;
ALTER TABLE available_plugins DROP COLUMN IF EXISTS zip_url;
ALTER TABLE available_plugins DROP COLUMN IF EXISTS plan_requirement;
ALTER TABLE available_plugins DROP COLUMN IF EXISTS post_types;
ALTER TABLE available_plugins DROP COLUMN IF EXISTS campops_version;
