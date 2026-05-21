-- Rollback: 007_plugin_submissions
-- Removes all objects created by 007_plugin_submissions.sql.
-- WARNING: All submission records and review history will be permanently deleted.

DROP INDEX IF EXISTS idx_plugin_submissions_submitter;
DROP INDEX IF EXISTS idx_plugin_submissions_status;
DROP INDEX IF EXISTS idx_plugin_submissions_plugin_id;
DROP TABLE IF EXISTS plugin_submissions;
