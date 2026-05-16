import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const posRouter = (api: PluginAPI) => {
  const app = new Hono();

  // List items
  app.get('/items', async (c) => {
    const items = await api.db.query(`
      SELECT pi.*, pc.name AS category_name
      FROM pos_items pi
      LEFT JOIN pos_categories pc ON pc.id = pi.category_id
      WHERE pi.is_active = true
      ORDER BY pc.sort_order, pi.name
    `);
    return c.json({ data: items });
  });

  // List categories
  app.get('/categories', async (c) => {
    const cats = await api.db.query(`
      SELECT * FROM pos_categories 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    return c.json({ data: cats });
  });

  return app;
};
