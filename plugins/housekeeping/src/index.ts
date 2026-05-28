import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { registerHousekeepingRoutes } from './routes/housekeeping.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Housekeeping Plugin');

  api.db.execute(`
    CREATE TABLE IF NOT EXISTS plugin_housekeeping_tasks (
      id TEXT PRIMARY KEY,
      room_id TEXT,
      category TEXT NOT NULL DEFAULT 'cleaning',
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      assigned_to TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  api.db.execute('CREATE INDEX IF NOT EXISTS idx_hk_tasks_room_status ON plugin_housekeeping_tasks(room_id, status)');
  api.db.execute('CREATE INDEX IF NOT EXISTS idx_hk_tasks_assigned ON plugin_housekeeping_tasks(assigned_to, status)');
  api.db.execute('CREATE INDEX IF NOT EXISTS idx_hk_tasks_status_priority ON plugin_housekeeping_tasks(status, priority, created_at DESC)');

  registerHousekeepingRoutes(api);

  api.hooks.register('reservation:after_checkout', async (data: any) => {
    api.logger.info(`Creating cleaning task for room: ${data.room_id}`);
    const id = crypto.randomUUID();
    api.db.execute(
      `INSERT INTO plugin_housekeeping_tasks (id, room_id, category, status, priority, created_at, updated_at)
       VALUES (?, ?, 'cleaning', 'pending', 'high', datetime('now'), datetime('now'))`,
      [id, data.room_id]
    );
    return data;
  });

  api.logger.info('Housekeeping Plugin initialized successfully');
}
