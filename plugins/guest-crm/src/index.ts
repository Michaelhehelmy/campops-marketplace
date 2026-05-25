import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { crmRouter } from './routes/crm.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Guest CRM Plugin');

  api.registerRoute('/api/p/crm', crmRouter(api));

  // GET /api/p/crm/guests-by-listing — guests from reservations (migrated from core)
  api.registerRoute('/api/p/crm/guests-by-listing', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const url = new URL(req.url);
        const listingId = url.searchParams.get('listingId');
        if (!listingId) {
          return new Response(JSON.stringify({ error: 'listingId required' }), { status: 400 });
        }

        const guests = await api.db.query(
          `SELECT DISTINCT
            u.id,
            u.name,
            u.email,
            COUNT(r.id) as stays,
            MAX(r.check_in) as last_stay,
            SUM(r.total_price) as total_spend
          FROM users u
          JOIN reservations r ON u.id = r.user_id
          WHERE r.property_id = ? OR r.property_id IN (SELECT id FROM properties WHERE slug = ?)
          GROUP BY u.id`,
          [listingId, listingId]
        );

        const formatted = (guests || []).map((g: any) => ({
          id: g.id,
          name: g.name || 'Anonymous',
          email: g.email,
          stays: g.stays,
          lastStay: g.last_stay,
          spend: g.total_spend || 0,
          rating: 5,
        }));

        return new Response(JSON.stringify({ guests: formatted }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        api.logger.error('[GuestCRM] Error fetching guests:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  // GET /api/p/crm/stats — generic tenant stats (migrated from core)
  api.registerRoute('/api/p/crm/stats', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const url = new URL(req.url);
        const listingId = url.searchParams.get('listingId');
        if (!listingId) {
          return new Response(JSON.stringify({ error: 'listingId required' }), { status: 400 });
        }

        const tenant = await api.db.queryOne(
          'SELECT id, name, is_active, plan FROM properties WHERE id = ? OR slug = ?',
          [listingId, listingId]
        );

        const pluginCount = await api.db.queryOne(
          'SELECT COUNT(*) as count FROM property_plugins WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?)) AND is_enabled = 1',
          [listingId, listingId]
        );

        const pwaPlugin = await api.db.queryOne(
          "SELECT is_enabled FROM property_plugins WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?)) AND plugin_name = 'pwa'",
          [listingId, listingId]
        );

        const stats = {
          tenantId: (tenant as any)?.id || listingId,
          tenantName: (tenant as any)?.name || null,
          plan: (tenant as any)?.plan || 'basic',
          isActive: !!(tenant as any)?.is_active,
          enabledPlugins: (pluginCount as any)?.count || 0,
          pwaActive: !!(pwaPlugin as any)?.is_enabled,
        };

        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        api.logger.error('[CRM Plugin] Stats error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    },
  });

  api.hooks.register('reservations.after_create', async (data: any) => {
    api.logger.info(`Updating guest profile for reservation: ${data.id}`);
    return data;
  });

  api.logger.info('Guest CRM Plugin initialized successfully');
}
