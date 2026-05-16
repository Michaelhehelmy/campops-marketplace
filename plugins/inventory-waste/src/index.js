import { inventoryRouter } from './routes/inventory.js';
import { wasteRouter } from './routes/waste.js';
export async function init(api) {
  api.logger.info('Initializing Inventory & Waste Plugin');
  // Register routes
  api.registerRoute('/api/inventory', inventoryRouter(api));
  api.registerRoute('/api/waste', wasteRouter(api));
  api.logger.info('Inventory & Waste Plugin initialized successfully');
}
