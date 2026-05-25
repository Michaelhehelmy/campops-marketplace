import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const otaRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const session = await api.auth.getSession(c.req.raw);
    if (!session) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  });

  app.get('/calendars', async (c) => {
    const roomId = c.req.query('roomId');
    let sql =
      'SELECT ec.*, r.name AS room_name FROM external_calendars ec JOIN rooms r ON r.id = ec.room_id';
    const params = [];

    if (roomId) {
      sql += ' WHERE ec.room_id = $1';
      params.push(roomId);
    }

    const rows = await api.db.query(sql, params);
    return c.json({ data: rows });
  });

  app.post('/calendars', async (c) => {
    const { room_id, name, url } = await c.req.json();
    const id = crypto.randomUUID();

    await api.db.execute(
      `
      INSERT INTO external_calendars (id, room_id, name, url)
      VALUES ($1, $2, $3, $4)
    `,
      [id, room_id, name, url]
    );

    return c.json({ success: true, id }, 201);
  });

  app.get('/conflicts', async (c) => {
    const rows = await api.db.query(`
      SELECT r.*, rm.name AS room_name
      FROM reservations r
      JOIN rooms rm ON rm.id = r.room_id
      WHERE r.status = 'conflict_pending'
      ORDER BY r.check_in ASC
    `);
    return c.json({ data: rows });
  });

  return app;
};
