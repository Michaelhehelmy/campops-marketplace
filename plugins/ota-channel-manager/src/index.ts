import { PluginAPI } from '@sinaicamps/plugin-sdk';
import { otaRouter } from './routes/ota.js';

export async function init(api: PluginAPI) {
  api.logger.info('Initializing OTA & Channel Management Plugin');

  // Register routes
  api.registerRoute('/api/ota', otaRouter(api));

  // Example hook: trigger sync on interval or event
  api.hooks.register('cron.hourly', async () => {
    api.logger.info('Triggering hourly OTA sync');
    // Call sync service logic
  });

  api.logger.info('OTA & Channel Management Plugin initialized successfully');
}
