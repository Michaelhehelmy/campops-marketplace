import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { activityRouter } from './routes/activities.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Activities Plugin');

  api.registerRoute('/api/p/activities', activityRouter(api));

  api.logger.info('Activities Plugin initialized successfully');
}
