import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { otaRouter } from './routes/ota.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing OTA & Channel Management Plugin');

  api.registerRoute('/api/p/ota', otaRouter(api));

  api.hooks.register('cron.hourly', async () => {
    api.logger.info('Triggering hourly OTA sync');
  });

  api.logger.info('OTA & Channel Management Plugin initialized successfully');
}
