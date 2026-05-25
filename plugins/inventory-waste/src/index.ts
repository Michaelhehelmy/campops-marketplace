import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { inventoryRouter } from './routes/inventory.js';
import { wasteRouter } from './routes/waste.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Inventory & Waste Plugin');

  await api.db.query(`
    CREATE TABLE IF NOT EXISTS plugin_inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      quantity REAL DEFAULT 0,
      par_level REAL DEFAULT 0,
      reorder_point REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await api.db.query(`
    CREATE TABLE IF NOT EXISTS plugin_waste_logs (
      id TEXT PRIMARY KEY,
      inventory_item_id TEXT,
      item TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      reason TEXT,
      cost REAL DEFAULT 0,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inventory_item_id) REFERENCES plugin_inventory_items(id)
    )
  `);

  await api.db.query('CREATE INDEX IF NOT EXISTS idx_inv_items_category ON plugin_inventory_items(category)');
  await api.db.query('CREATE INDEX IF NOT EXISTS idx_waste_logs_item ON plugin_waste_logs(inventory_item_id, date DESC)');
  await api.db.query('CREATE INDEX IF NOT EXISTS idx_inv_items_low_stock ON plugin_inventory_items(quantity, reorder_point) WHERE quantity <= reorder_point');

  api.registerRoute('/api/p/inventory', inventoryRouter(api));
  api.registerRoute('/api/p/waste', wasteRouter(api));

  api.logger.info('Inventory & Waste Plugin initialized successfully');
}
