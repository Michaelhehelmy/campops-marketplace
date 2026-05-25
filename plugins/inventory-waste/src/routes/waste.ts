import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const wasteRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  });

  app.get('/', async (c) => {
    const entries = await api.db.query('SELECT * FROM plugin_waste_logs ORDER BY date DESC');
    return c.json({ data: entries });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await api.db.execute(
      `
      INSERT INTO plugin_waste_logs (id, inventory_item_id, item, quantity, unit, reason, cost, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
      [id, body.inventory_item_id, body.item, body.quantity, body.unit, body.reason, body.cost]
    );

    // Deduct from inventory if linked
    if (body.inventory_item_id) {
      await api.db.execute('UPDATE plugin_inventory_items SET quantity = quantity - $1 WHERE id = $2', [
        body.quantity,
        body.inventory_item_id,
      ]);
    }

    return c.json({ success: true, id }, 201);
  });

  return app;
};
