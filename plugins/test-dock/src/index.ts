import { Hono, type Context } from 'hono';
import { PluginAPI } from '@sinaicamps/plugin-sdk';
import { UISlots } from '../../../packages/plugin-sdk/src/ui.js';

export async function init(api: PluginAPI) {
  api.logger.info('Test Dock Plugin initializing...');

  // 1. Create plugin table using the standard convention.
  //    The resulting table name will be: plugin_test_dock_dummy
  //    Columns auto-added: id, property_id, created_at, updated_at
  await api.db.createTable(
    'dummy',
    `
    name TEXT NOT NULL,
    value TEXT DEFAULT ''
  `
  );

  // 2. Register Route
  const router = new Hono<{ Variables: { propertyId?: string } }>();

  router.get('/ping', async (c: Context<{ Variables: { propertyId?: string } }>) => {
    await api.hooks.executeHook('payment.success', { amount: 50, test: true });
    return c.json({
      pong: true,
      tenant: c.get('propertyId') || 'unknown',
      plugin: api.pluginId,
      table: 'plugin_test_dock_dummy',
    });
  });

  // List rows in the plugin's own table, scoped to the current property
  router.get('/dummy', async (c: Context<{ Variables: { propertyId?: string } }>) => {
    const propertyId = c.get('propertyId');
    const rows = await api.db.query(
      propertyId
        ? 'SELECT * FROM plugin_test_dock_dummy WHERE property_id = $1 ORDER BY created_at DESC'
        : 'SELECT * FROM plugin_test_dock_dummy ORDER BY created_at DESC',
      propertyId ? [propertyId] : []
    );
    return c.json({ data: rows });
  });

  api.registerRoute('/api/test-dock', router);

  // 3. Register Hook
  api.hooks.registerHook(
    'payment.success',
    async (data: { amount: number; test: boolean }) => {
      api.logger.info('Hook fired for payment.success', data);
      return data;
    },
    10
  );

  // 4. Register UI extensions
  api.ui.registerMenuItem?.({
    label: 'Test Dock',
    path: '/admin/test-dock',
  });

  // 5. Register a dashboard widget slot key so the server registry knows
  //    the component is active. The actual React component is injected
  //    client-side via usePluginSlot(UISlots.DASHBOARD_WIDGETS, HelloWidget).
  api.ui.registerSlot?.(UISlots.DASHBOARD_WIDGETS, `test-dock:hello-widget`);

  api.logger.info('Test Dock Plugin ready. Table: plugin_test_dock_dummy');
}
