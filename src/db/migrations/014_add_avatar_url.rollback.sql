-- Rollback migration 014: Remove avatar_url from profiles
-- SQLite does not support DROP COLUMN, so this is a no-op for safety.
-- To fully revert, restore from backup or recreate the table.
SELECT 1;
