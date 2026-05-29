import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function registerMaintenanceRoutes(api: PluginAPI) {
  const handleList = async (req: Request) => {
    const session = await api.auth.getSession(req);
    if (!session) return unauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const assignedTo = url.searchParams.get('assigned_to');

    let sql = `SELECT * FROM plugin_maintenance_requests WHERE 1=1`;
    const params: any[] = [];

    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (priority) { sql += ` AND priority = ?`; params.push(priority); }
    if (assignedTo) { sql += ` AND assigned_to = ?`; params.push(assignedTo); }

    sql += ` ORDER BY created_at DESC`;

    const requests = await api.db.query(sql, params);
    return new Response(JSON.stringify({ requests }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleCreate = async (req: Request) => {
    const session = await api.auth.getSession(req);
    if (!session) return unauthorized();

    const body = await req.json();
    if (!body.title) {
      return new Response(JSON.stringify({ error: 'Missing required field: title' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = crypto.randomUUID();

    await api.db.execute(
      `INSERT INTO plugin_maintenance_requests (id, title, description, location, priority, status, reported_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', ?, datetime('now'), datetime('now'))`,
      [id, body.title, body.description || '', body.location || '', body.priority || 'medium', session.user.id]
    );

    const request = await api.db.queryOne('SELECT * FROM plugin_maintenance_requests WHERE id = ?', [id]);
    return new Response(JSON.stringify({ request }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleGetById = async (req: Request) => {
    const session = await api.auth.getSession(req);
    if (!session) return unauthorized();

    const id = extractId(req);
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
    }

    const request = await api.db.queryOne('SELECT * FROM plugin_maintenance_requests WHERE id = ?', [id]);
    if (!request) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ request }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleUpdate = async (req: Request) => {
    const session = await api.auth.getSession(req);
    if (!session) return unauthorized();

    const id = extractId(req);
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
    }

    const body = await req.json();
    const updates: string[] = [];
    const params: any[] = [];

    if (body.status !== undefined) { updates.push('status = ?'); params.push(body.status); }
    if (body.priority !== undefined) { updates.push('priority = ?'); params.push(body.priority); }
    if (body.assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(body.assigned_to); }
    if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title); }
    if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description); }
    if (body.location !== undefined) { updates.push('location = ?'); params.push(body.location); }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(id);

    await api.db.execute(
      `UPDATE plugin_maintenance_requests SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const request = await api.db.queryOne('SELECT * FROM plugin_maintenance_requests WHERE id = ?', [id]);
    return new Response(JSON.stringify({ request }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleDelete = async (req: Request) => {
    const session = await api.auth.getSession(req);
    if (!session) return unauthorized();

    const id = extractId(req);
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
    }

    const existing = await api.db.queryOne('SELECT * FROM plugin_maintenance_requests WHERE id = ?', [id]);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    await api.db.execute('DELETE FROM plugin_maintenance_requests WHERE id = ?', [id]);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  api.registerRoute('/api/p/maintenance', {
    GET: handleList,
    POST: handleCreate,
  });

  api.registerRoute('/api/p/maintenance/:id', {
    GET: handleGetById,
    PATCH: handleUpdate,
    DELETE: handleDelete,
  });
}

function extractId(req: Request): string | null {
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || null;
}
