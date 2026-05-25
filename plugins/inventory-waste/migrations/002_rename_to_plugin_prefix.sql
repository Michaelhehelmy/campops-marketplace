-- Rename inventory/waste tables to plugin_* prefix
ALTER TABLE inventory_items RENAME TO plugin_inventory_items;
ALTER TABLE waste_log RENAME TO plugin_waste_logs;

-- Recreate indexes on renamed tables
DROP INDEX IF EXISTS idx_inventory_items_category;
DROP INDEX IF EXISTS idx_waste_log_date;
CREATE INDEX IF NOT EXISTS idx_plugin_inventory_items_category ON plugin_inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_plugin_waste_logs_date ON plugin_waste_logs(date);
