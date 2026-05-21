import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { posRouter } from './routes/pos.js';
import { orderRouter } from './routes/orders.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing POS & KDS Plugin');

  api.registerRoute('/api/p/pos', posRouter(api));
  api.registerRoute('/api/p/orders', orderRouter(api));

  api.logger.info('POS & KDS Plugin initialized successfully');
}
