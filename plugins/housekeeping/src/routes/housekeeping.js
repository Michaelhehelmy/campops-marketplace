import { Hono } from 'hono';
export const housekeepingRouter = (api) => {
  const app = new Hono();
  app.get('/', async (c) => {
    const status = c.req.query('status');
    let sql = 'SELECT * FROM housekeeping_tasks';
    const params = [];
    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    const tasks = await api.db.query(sql, params);
    return c.json({ data: tasks });
  });
  app.patch('/tasks/:id/status', async (c) => {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    await api.db.execute(
      'UPDATE housekeeping_tasks SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
    // Check if cleaning finished to mark room as available
    const task = await api.db.queryOne(
      'SELECT room_id, category FROM housekeeping_tasks WHERE id = $1',
      [id]
    );
    if (task?.category === 'cleaning' && status === 'completed') {
      await api.hooks.execute('rooms.status_updated', { id: task.room_id, status: 'available' });
    }
    return c.json({ success: true, status });
  });
  return app;
};
