import { Hono } from 'hono';
export const inventoryRouter = (api) => {
  const app = new Hono();
  app.get('/', async (c) => {
    const items = await api.db.query('SELECT * FROM inventory_items ORDER BY name ASC');
    return c.json({ data: items });
  });
  app.post('/', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    await api.db.execute(
      `
      INSERT INTO inventory_items (id, name, category, unit, quantity, par_level, reorder_point, cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        id,
        body.name,
        body.category,
        body.unit,
        body.quantity,
        body.par_level,
        body.reorder_point,
        body.cost,
      ]
    );
    return c.json({ success: true, id }, 201);
  });
  return app;
};
