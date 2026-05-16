import { Hono } from 'hono';
export const wasteRouter = (api) => {
  const app = new Hono();
  app.get('/', async (c) => {
    const entries = await api.db.query('SELECT * FROM waste_log ORDER BY date DESC');
    return c.json({ data: entries });
  });
  app.post('/', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await api.db.execute(
      `
      INSERT INTO waste_log (id, inventory_item_id, item, quantity, unit, reason, cost, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
      [id, body.inventory_item_id, body.item, body.quantity, body.unit, body.reason, body.cost]
    );
    // Deduct from inventory if linked
    if (body.inventory_item_id) {
      await api.db.execute('UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2', [
        body.quantity,
        body.inventory_item_id,
      ]);
    }
    return c.json({ success: true, id }, 201);
  });
  return app;
};
