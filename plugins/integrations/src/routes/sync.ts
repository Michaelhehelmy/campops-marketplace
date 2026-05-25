import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export function syncRouter(api: PluginAPI) {
  return {
    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const body = await req.json();
      const { calendar_id } = body;

      if (!calendar_id) {
        return new Response(JSON.stringify({ error: 'Missing calendar_id' }), { status: 400 });
      }

      const calendar = await api.db.queryOne(
        'SELECT * FROM plugin_integrations_external_calendars WHERE id = ?',
        [calendar_id]
      );

      if (!calendar) {
        return new Response(JSON.stringify({ error: 'Calendar not found' }), { status: 404 });
      }

      const logId = crypto.randomUUID();
      await api.db.execute(
        `INSERT INTO plugin_integrations_integration_logs (id, integration_type, direction, status, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [logId, 'ical_sync', 'import', 'completed', JSON.stringify({ calendar_id }), Date.now()]
      );

      await api.db.execute(
        `UPDATE plugin_integrations_external_calendars SET last_synced_at = ?, updated_at = ? WHERE id = ?`,
        [Date.now(), Date.now(), calendar_id]
      );

      return new Response(JSON.stringify({ success: true, log_id: logId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const calendarId = url.searchParams.get('calendar_id');

      if (calendarId) {
        const logs = await api.db.query(
          'SELECT * FROM plugin_integrations_integration_logs WHERE integration_type = ? ORDER BY created_at DESC LIMIT 50',
          ['ical_sync']
        );
        return new Response(JSON.stringify({ logs }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const logs = await api.db.query(
        'SELECT * FROM plugin_integrations_integration_logs ORDER BY created_at DESC LIMIT 50'
      );
      return new Response(JSON.stringify({ logs }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}
