-- Rename housekeeping_tasks to plugin_housekeeping_tasks
ALTER TABLE housekeeping_tasks RENAME TO plugin_housekeeping_tasks;

-- Recreate indexes on renamed table
DROP INDEX IF EXISTS idx_housekeeping_tasks_status;
DROP INDEX IF EXISTS idx_housekeeping_tasks_room_id;
CREATE INDEX IF NOT EXISTS idx_plugin_housekeeping_tasks_status ON plugin_housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_plugin_housekeeping_tasks_room_id ON plugin_housekeeping_tasks(room_id);
