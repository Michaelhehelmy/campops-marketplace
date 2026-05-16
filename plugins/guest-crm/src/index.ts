import { PluginAPI } from '@sinaicamps/plugin-sdk';
import { crmRouter } from './routes/crm.js';

export async function init(api: PluginAPI) {
  api.logger.info('Initializing Guest CRM Plugin');

  // Register routes
  api.registerRoute('/api/crm', crmRouter(api));

  // Listen for new reservations to automatically create/update guest profiles
  api.hooks.register('reservations.after_create', async (data: any) => {
    api.logger.info(`Updating guest profile for reservation: ${data.id}`);
    // Logic to sync reservation data to CRM profile
    return data;
  });

  api.logger.info('Guest CRM Plugin initialized successfully');
}
