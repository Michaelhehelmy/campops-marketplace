import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const crmRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  });

  app.get('/guests', async (c) => {
    const search = c.req.query('search');
    let sql = 'SELECT * FROM guests';
    const params = [];

    if (search) {
      sql += ' WHERE full_name ILIKE $1 OR email ILIKE $2';
      params.push(`%${search}%`, `%${search}%`);
    }

    const guests = await api.db.query(sql, params);
    return c.json({ data: guests });
  });

  app.get('/segments', async (c) => {
    const segments = await api.db.query('SELECT * FROM guest_segments WHERE is_active = true');
    return c.json({ data: segments });
  });

  return app;
};
