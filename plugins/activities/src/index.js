import { activityRouter } from './routes/activities.js';
export async function init(api) {
  api.logger.info('Initializing Activities Plugin');
  // Register routes
  api.registerRoute('/api/activities', activityRouter(api));
  api.logger.info('Activities Plugin initialized successfully');
}
