import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { maintenanceRouter } from './routes/maintenance.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Maintenance Plugin');

  api.registerRoute('/api/p/maintenance', maintenanceRouter(api));

  api.logger.info('Maintenance Plugin initialized successfully');
}
