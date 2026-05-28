import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function registerHousekeepingRoutes(api: PluginAPI) {
  api.registerRoute('/api/p/housekeeping', {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const status = url.searchParams.get('status');
      const assignedTo = url.searchParams.get('assignedTo');
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }
      if (assignedTo) {
        conditions.push('assigned_to = ?');
        params.push(assignedTo);
      }

      let sql = 'SELECT * FROM plugin_housekeeping_tasks';
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY created_at DESC';

      const tasks = await api.db.query(sql, params);
      return new Response(JSON.stringify({ tasks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      try {
        const body = await req.json();
        if (!body.room_id || !body.category) {
          return new Response(JSON.stringify({ error: 'room_id and category are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_housekeeping_tasks (id, room_id, category, status, priority, assigned_to, notes, created_at, updated_at)
           VALUES (?, ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`,
          [id, body.room_id, body.category, body.priority || 'normal', body.assigned_to || null, body.notes || null]
        );

        const task = await api.db.queryOne('SELECT * FROM plugin_housekeeping_tasks WHERE id = ?', [id]);
        return new Response(JSON.stringify({ task }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
  });

  api.registerRoute('/api/p/housekeeping/:id', {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const id = url.searchParams.get(':id') || url.pathname.split('/').pop();
      const task = await api.db.queryOne('SELECT * FROM plugin_housekeeping_tasks WHERE id = ?', [id]);
      if (!task) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ task }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    PATCH: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const id = url.searchParams.get(':id') || url.pathname.split('/').pop();
      const body = await req.json();

      const fields: string[] = [];
      const params: unknown[] = [];

      if (body.status !== undefined) {
        fields.push('status = ?');
        params.push(body.status);
      }
      if (body.priority !== undefined) {
        fields.push('priority = ?');
        params.push(body.priority);
      }
      if (body.assigned_to !== undefined) {
        fields.push('assigned_to = ?');
        params.push(body.assigned_to);
      }
      if (body.notes !== undefined) {
        fields.push('notes = ?');
        params.push(body.notes);
      }
      if (body.category !== undefined) {
        fields.push('category = ?');
        params.push(body.category);
      }

      if (fields.length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      fields.push("updated_at = datetime('now')");
      params.push(id);

      await api.db.execute(
        `UPDATE plugin_housekeeping_tasks SET ${fields.join(', ')} WHERE id = ?`,
        params
      );

      const task = await api.db.queryOne('SELECT * FROM plugin_housekeeping_tasks WHERE id = ?', [id]);
      return new Response(JSON.stringify({ task }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    DELETE: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const id = url.searchParams.get(':id') || url.pathname.split('/').pop();
      const task = await api.db.queryOne('SELECT * FROM plugin_housekeeping_tasks WHERE id = ?', [id]);
      if (!task) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await api.db.execute('DELETE FROM plugin_housekeeping_tasks WHERE id = ?', [id]);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });
}
