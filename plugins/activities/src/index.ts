import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { activityRouter } from './routes/activities.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Activities Plugin');

  await api.db.createTable(
    'activities',
    `
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    price REAL DEFAULT 0,
    capacity INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  `
  );

  api.registerRoute('/api/p/activities', activityRouter(api));

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_activities_type_date ON plugin_activities_activities(type, date)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_activities_date ON plugin_activities_activities(date)');

  api.logger.info('Activities Plugin initialized successfully');
}
