import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const orderRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  });

  app.get('/', async (c) => {
    const status = c.req.query('status');
    let sql = 'SELECT * FROM plugin_pos_orders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = $1';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';
    const plugin_pos_orders = await api.db.query(sql, params);
    return c.json({ data: plugin_pos_orders });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now()}`;

    // Simplified insertion for example
    await api.db.execute(
      `
      INSERT INTO plugin_pos_orders (id, order_number, status, total, items, created_at, updated_at)
      VALUES ($1, $2, 'placed', $3, $4, NOW(), NOW())
    `,
      [id, orderNumber, body.total, JSON.stringify(body.items)]
    );

    return c.json({ success: true, id, order_number: orderNumber }, 201);
  });

  app.patch('/:id/status', async (c) => {
    const id = c.req.param('id');
    const { status } = await c.req.json();

    await api.db.execute('UPDATE plugin_pos_orders SET status = $1, updated_at = NOW() WHERE id = $2', [
      status,
      id,
    ]);

    // Trigger hook for other plugins
    await api.hooks.execute('pos.order_status_updated', { id, status });

    return c.json({ success: true, status });
  });

  return app;
};
