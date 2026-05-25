import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export function campaignRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const section = url.searchParams.get('section') || 'campaigns';

      if (section === 'campaigns') {
        const campaigns = await api.db.query(
          'SELECT * FROM plugin_marketing_automation_campaigns ORDER BY created_at DESC'
        );
        return new Response(JSON.stringify({ campaigns }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'segments') {
        const segments = await api.db.query(
          'SELECT * FROM plugin_marketing_automation_segments ORDER BY created_at DESC'
        );
        return new Response(JSON.stringify({ segments }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'triggers') {
        const triggers = await api.db.query(
          'SELECT * FROM plugin_marketing_automation_automation_triggers ORDER BY created_at DESC'
        );
        return new Response(JSON.stringify({ triggers }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },

    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const body = await req.json();
      const section = new URL(req.url).searchParams.get('section') || 'campaigns';

      if (section === 'campaigns') {
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_marketing_automation_campaigns (id, listing_id, name, type, subject, content, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
          [id, body.listing_id || null, body.name, body.type, body.subject || '', body.content || '', Date.now(), Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'segments') {
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_marketing_automation_segments (id, listing_id, name, criteria, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, body.listing_id || null, body.name, body.criteria || '', Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'triggers') {
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_marketing_automation_automation_triggers (id, campaign_id, trigger_event, delay_minutes, created_at) VALUES (?, ?, ?, ?, ?)`,
          [id, body.campaign_id, body.trigger_event, body.delay_minutes || 0, Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },
  };
}
