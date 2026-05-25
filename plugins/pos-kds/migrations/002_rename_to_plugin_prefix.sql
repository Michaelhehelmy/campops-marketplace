-- Rename POS tables to plugin_* prefix
ALTER TABLE pos_categories RENAME TO plugin_pos_categories;
ALTER TABLE pos_items RENAME TO plugin_pos_items;
ALTER TABLE orders RENAME TO plugin_pos_orders;

-- Recreate indexes on renamed tables
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_pos_items_category;
CREATE INDEX IF NOT EXISTS idx_plugin_pos_orders_status ON plugin_pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_plugin_pos_items_category ON plugin_pos_items(category_id);
