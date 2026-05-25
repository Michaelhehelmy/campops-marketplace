-- Rename maintenance_requests to plugin_maintenance_requests
ALTER TABLE maintenance_requests RENAME TO plugin_maintenance_requests;

-- Recreate indexes on renamed table
DROP INDEX IF EXISTS idx_maintenance_status;
DROP INDEX IF EXISTS idx_maintenance_priority;
CREATE INDEX IF NOT EXISTS idx_plugin_maintenance_status ON plugin_maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_plugin_maintenance_priority ON plugin_maintenance_requests(priority);
