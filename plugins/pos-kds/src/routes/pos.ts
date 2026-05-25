import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const posRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  });

  // List items
  app.get('/items', async (c) => {
    const items = await api.db.query(`
      SELECT pi.*, pc.name AS category_name
      FROM plugin_pos_items pi
      LEFT JOIN plugin_pos_categories pc ON pc.id = pi.category_id
      WHERE pi.is_active = true
      ORDER BY pc.sort_order, pi.name
    `);
    return c.json({ data: items });
  });

  // List categories
  app.get('/categories', async (c) => {
    const cats = await api.db.query(`
      SELECT * FROM plugin_pos_categories 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    return c.json({ data: cats });
  });

  return app;
};
