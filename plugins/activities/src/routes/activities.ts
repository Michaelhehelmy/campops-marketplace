import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const activityRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.get('/', async (c) => {
    const activities = await api.db.query(
      'SELECT * FROM activities WHERE is_active = true ORDER BY name'
    );
    return c.json({ data: activities });
  });

  app.post('/', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await api.db.execute(
      `
      INSERT INTO activities (id, name, description, category, duration_minutes, max_capacity, base_price, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `,
      [
        id,
        body.name,
        body.description,
        body.category,
        body.duration_minutes,
        body.max_capacity,
        body.base_price,
      ]
    );

    return c.json({ success: true, id }, 201);
  });

  return app;
};
