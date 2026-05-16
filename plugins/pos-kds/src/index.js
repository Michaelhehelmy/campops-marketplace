import { posRouter } from './routes/pos.js';
import { orderRouter } from './routes/orders.js';
export async function init(api) {
  api.logger.info('Initializing POS & KDS Plugin');
  // Register routes
  api.registerRoute('/api/pos', posRouter(api));
  api.registerRoute('/api/orders', orderRouter(api));
  api.logger.info('POS & KDS Plugin initialized successfully');
}
