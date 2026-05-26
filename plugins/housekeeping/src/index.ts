import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { housekeepingRouter } from './routes/housekeeping.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Housekeeping Plugin');

  await api.db.query(`
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

  await api.db.query('CREATE INDEX IF NOT EXISTS idx_hk_tasks_room_status ON plugin_housekeeping_tasks(room_id, status)');
  await api.db.query('CREATE INDEX IF NOT EXISTS idx_hk_tasks_assigned ON plugin_housekeeping_tasks(assigned_to, status)');
  await api.db.query('CREATE INDEX IF NOT EXISTS idx_hk_tasks_status_priority ON plugin_housekeeping_tasks(status, priority, created_at DESC)');

  api.registerRoute('/api/p/housekeeping', housekeepingRouter(api));

  api.hooks.register('reservation:after_checkout', async (data: any) => {
    api.logger.info(`Creating cleaning task for room: ${data.room_id}`);
    const id = crypto.randomUUID();
    await api.db.query(
      `INSERT INTO plugin_housekeeping_tasks (id, room_id, category, status, priority, created_at)
       VALUES ($1, $2, 'cleaning', 'pending', 'high', NOW())`,
      [id, data.room_id]
    );
    return data;
  });

  api.logger.info('Housekeeping Plugin initialized successfully');
}
