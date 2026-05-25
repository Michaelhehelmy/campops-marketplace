import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export function integrationRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const propertyId = url.searchParams.get('property_id');

      if (propertyId) {
        const calendars = await api.db.query(
          'SELECT * FROM plugin_integrations_external_calendars WHERE property_id = ? ORDER BY created_at DESC',
          [propertyId]
        );
        return new Response(JSON.stringify({ calendars }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const calendars = await api.db.query(
        'SELECT * FROM plugin_integrations_external_calendars ORDER BY created_at DESC'
      );
      return new Response(JSON.stringify({ calendars }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const body = await req.json();
      const id = crypto.randomUUID();

      await api.db.execute(
        `INSERT INTO plugin_integrations_external_calendars (id, property_id, platform, ical_url, credentials, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        [id, body.property_id, body.platform, body.ical_url || '', body.credentials || '', Date.now(), Date.now()]
      );

      return new Response(JSON.stringify({ id }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    PATCH: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
      }

      const body = await req.json();
      const updates: string[] = ['updated_at = ?'];
      const params: any[] = [Date.now()];

      if (body.ical_url !== undefined) { updates.push('ical_url = ?'); params.push(body.ical_url); }
      if (body.credentials !== undefined) { updates.push('credentials = ?'); params.push(body.credentials); }
      if (body.is_active !== undefined) { updates.push('is_active = ?'); params.push(body.is_active); }
      if (body.last_synced_at !== undefined) { updates.push('last_synced_at = ?'); params.push(body.last_synced_at); }

      params.push(id);
      await api.db.execute(
        `UPDATE plugin_integrations_external_calendars SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    DELETE: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
      }

      await api.db.execute('DELETE FROM plugin_integrations_external_calendars WHERE id = ?', [id]);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
