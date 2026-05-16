import { PluginAPI } from '@campops/plugin-sdk';
import { activityRouter } from './routes/activities.js';

export async function init(api: PluginAPI) {
  api.logger.info('Initializing Activities Plugin');

  // Register routes
  api.registerRoute('/api/activities', activityRouter(api));

  api.logger.info('Activities Plugin initialized successfully');
}
