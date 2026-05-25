import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { maintenanceRouter } from './routes/maintenance.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Maintenance Plugin');

  await api.db.query(`
    CREATE TABLE IF NOT EXISTS plugin_maintenance_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to TEXT,
      reported_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await api.db.query('CREATE INDEX IF NOT EXISTS idx_maint_status_priority ON plugin_maintenance_requests(status, priority, created_at DESC)');
  await api.db.query('CREATE INDEX IF NOT EXISTS idx_maint_assigned ON plugin_maintenance_requests(assigned_to, status)');

  api.registerRoute('/api/p/maintenance', maintenanceRouter(api));

  api.logger.info('Maintenance Plugin initialized successfully');
}
