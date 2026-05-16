import { Hono } from 'hono';
export async function init(api) {
  api.logger.info('Test Dock Plugin initializing...');

  // 1. Database setup
  await api.db.createTable('dummy', 'name TEXT');

  // 2. Register Route
  const router = new Hono();
  router.get('/ping', async (c) => {
    await api.hooks.executeHook('payment.success', { amount: 50, test: true });
    return c.json({
      pong: true,
      tenant: c.get('propertyId') || 'unknown',
      plugin: api.pluginId,
    });
  });
  api.registerRoute('/api/test-dock', router);

  // 3. Register Hook
  api.hooks.registerHook(
    'payment.success',
    async (data) => {
      api.logger.info('HOT RELOADED hook fired for payment.success!', data);
      return data;
    },
    10
  );

  // 4. Register UI extensions
  api.ui.registerMenuItem?.({
    id: 'dynamic-item',
    label: 'Dynamic Plugin Item',
    path: '/admin/test-dock',
    order: 100,
  });

  api.ui.registerSlot?.('dashboard.widgets', 'test-dock-widget');

  api.logger.info('Test Dock Plugin ready.');
}
