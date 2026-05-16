import { PluginAPI } from '@campops/plugin-sdk';
import { rosterRouter } from './routes/roster.js';

export async function init(api: PluginAPI) {
  api.logger.info('Initializing Staff Roster Plugin');

  // Register routes
  api.registerRoute('/api/staff/roster', rosterRouter(api));

  api.logger.info('Staff Roster Plugin initialized successfully');
}
