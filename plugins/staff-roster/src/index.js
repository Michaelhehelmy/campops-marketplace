import { rosterRouter } from './routes/roster.js';
export async function init(api) {
  api.logger.info('Initializing Staff Roster Plugin');
  // Register routes
  api.registerRoute('/api/staff/roster', rosterRouter(api));
  api.logger.info('Staff Roster Plugin initialized successfully');
}
