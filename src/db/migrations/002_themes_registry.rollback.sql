-- Rollback: 002_themes_registry
-- Removes all objects created by 002_themes_registry.sql.

DROP INDEX IF EXISTS idx_available_themes_active;
DROP INDEX IF EXISTS idx_available_themes_name;
DROP TABLE IF EXISTS available_themes;
