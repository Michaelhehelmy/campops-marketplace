import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { posRouter } from './routes/pos.js';
import { orderRouter } from './routes/orders.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing POS & KDS Plugin');

  await api.db.query(`
    CREATE TABLE IF NOT EXISTS plugin_pos_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await api.db.query(`
    CREATE TABLE IF NOT EXISTS plugin_pos_items (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES plugin_pos_categories(id)
    )
  `);
  await api.db.query(`
    CREATE TABLE IF NOT EXISTS plugin_pos_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT,
      status TEXT NOT NULL DEFAULT 'placed',
      total REAL DEFAULT 0,
      items TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await api.db.query('CREATE INDEX IF NOT EXISTS idx_pos_orders_status_date ON plugin_pos_orders(status, created_at DESC)');
  await api.db.query('CREATE INDEX IF NOT EXISTS idx_pos_items_category ON plugin_pos_items(category_id)');

  api.registerRoute('/api/p/pos', posRouter(api));
  api.registerRoute('/api/p/orders', orderRouter(api));

  api.logger.info('POS & KDS Plugin initialized successfully');
}
