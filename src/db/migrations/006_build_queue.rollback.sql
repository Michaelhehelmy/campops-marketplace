-- Rollback: 006_build_queue
-- Removes the build_queue table created by 006_build_queue.sql.
-- WARNING: All queued and historical build job records will be lost.

DROP INDEX IF EXISTS idx_build_queue_status;
DROP INDEX IF EXISTS idx_build_queue_site_id;
DROP TABLE IF EXISTS build_queue;
