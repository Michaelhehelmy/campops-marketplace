import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function housekeepingRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      let tasks;
      if (status) {
        tasks = await api.db.query(
          'SELECT * FROM plugin_housekeeping_tasks WHERE status = ? ORDER BY created_at DESC',
          [status]
        );
      } else {
        tasks = await api.db.query('SELECT * FROM plugin_housekeeping_tasks ORDER BY created_at DESC');
      }
      return new Response(JSON.stringify({ tasks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    PATCH: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();
      const body = await req.json();
      await api.db.execute(
        'UPDATE plugin_housekeeping_tasks SET status = ?, updated_at = NOW() WHERE id = ?',
        [body.status, id]
      );
      return new Response(JSON.stringify({ id, status: body.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
