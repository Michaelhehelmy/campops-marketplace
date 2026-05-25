import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export function subscriptionRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const section = url.searchParams.get('section') || 'subscriptions';

      if (section === 'plans') {
        const plans = await api.db.query(
          'SELECT * FROM plugin_subscriptions_plans WHERE is_active = 1 ORDER BY price'
        );
        return new Response(JSON.stringify({ plans }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'subscriptions') {
        const listingId = url.searchParams.get('listing_id');
        if (listingId) {
          const subscriptions = await api.db.query(
            'SELECT * FROM plugin_subscriptions_subscriptions WHERE listing_id = ? ORDER BY created_at DESC',
            [listingId]
          );
          return new Response(JSON.stringify({ subscriptions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const subscriptions = await api.db.query(
          'SELECT * FROM plugin_subscriptions_subscriptions ORDER BY created_at DESC'
        );
        return new Response(JSON.stringify({ subscriptions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'revenue') {
        const totalMrr = await api.db.queryOne(
          "SELECT COALESCE(SUM(p.price), 0) as mrr FROM plugin_subscriptions_subscriptions s JOIN plugin_subscriptions_plans p ON p.id = s.plan_id WHERE s.status = 'active'"
        );
        const activeCount = await api.db.queryOne(
          "SELECT COUNT(*) as count FROM plugin_subscriptions_subscriptions WHERE status = 'active'"
        );
        return new Response(JSON.stringify({
          mrr: (totalMrr as any)?.mrr || 0,
          activeSubscriptions: (activeCount as any)?.count || 0,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },

    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const body = await req.json();
      const section = new URL(req.url).searchParams.get('section') || 'plans';

      if (section === 'plans') {
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_subscriptions_plans (id, listing_id, name, description, type, price, currency, billing_interval, max_duration, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, body.listing_id || null, body.name, body.description || '', body.type, body.price, body.currency || 'USD', body.billing_interval || 'month', body.max_duration || null, Date.now(), Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'subscriptions') {
        const id = crypto.randomUUID();
        const now = new Date().toISOString().split('T')[0];
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await api.db.execute(
          `INSERT INTO plugin_subscriptions_subscriptions (id, plan_id, listing_id, guest_id, guest_name, guest_email, status, current_period_start, current_period_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
          [id, body.plan_id, body.listing_id || null, body.guest_id || null, body.guest_name || '', body.guest_email || '', now, periodEnd, Date.now(), Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },
  };
}
