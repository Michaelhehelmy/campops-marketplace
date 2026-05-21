import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export function housekeepingRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      let tasks;
      if (status) {
        tasks = await api.db.query(
          'SELECT * FROM housekeeping_tasks WHERE status = ? ORDER BY created_at DESC',
          [status]
        );
      } else {
        tasks = await api.db.query('SELECT * FROM housekeeping_tasks ORDER BY created_at DESC');
      }
      return new Response(JSON.stringify({ tasks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    PATCH: async (req: Request) => {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();
      const body = await req.json();
      await api.db.execute(
        'UPDATE housekeeping_tasks SET status = ?, updated_at = NOW() WHERE id = ?',
        [body.status, id]
      );
      return new Response(JSON.stringify({ id, status: body.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
