import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export function activityRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const type = url.searchParams.get('type');
      if (type) {
        const activities = await api.db.query(
          'SELECT * FROM activities WHERE type = ? ORDER BY created_at DESC',
          [type]
        );
        return new Response(JSON.stringify({ activities }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const activities = await api.db.query('SELECT * FROM activities ORDER BY created_at DESC');
      return new Response(JSON.stringify({ activities }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    POST: async (req: Request) => {
      const body = await req.json();
      const id = crypto.randomUUID();
      await api.db.execute(
        `INSERT INTO activities (id, type, title, description, date, price, capacity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.type,
          body.title,
          body.description,
          body.date,
          body.price,
          body.capacity,
          Date.now(),
        ]
      );
      return new Response(JSON.stringify({ id }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
