import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const rosterRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.get('/', async (c) => {
    const { start, end } = c.req.query();
    if (!start || !end) return c.json({ error: 'start and end dates are required' }, 400);

    const shifts = await api.db.query(
      `
      SELECT s.*, p.full_name as full_name
      FROM staff_shifts s
      JOIN profiles p ON s.user_id = p.user_id
      WHERE s.shift_start >= $1 AND s.shift_end <= $2
      ORDER BY s.shift_start ASC
    `,
      [start, end]
    );

    return c.json({ data: shifts });
  });

  app.post('/shifts', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await api.db.execute(
      `
      INSERT INTO staff_shifts (id, user_id, shift_start, shift_end, role, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [id, body.user_id, body.shift_start, body.shift_end, body.role || 'staff', body.notes || null]
    );

    return c.json({ success: true, id }, 201);
  });

  return app;
};
