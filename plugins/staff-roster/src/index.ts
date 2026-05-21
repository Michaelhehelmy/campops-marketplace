import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { rosterRouter } from './routes/roster.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Staff Roster Plugin');

  api.registerRoute('/api/p/staff/roster', rosterRouter(api));

  // GET /api/p/staff — list staff for a listing (migrated from core)
  api.registerRoute('/api/p/staff', {
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

        const rows = await api.db.query(
          `SELECT ps.id, u.name, ps.role, u.email
           FROM property_staff ps
           LEFT JOIN users u ON ps.user_id = u.id
           WHERE ps.property_id = ?`,
          [listingId]
        );

        const formatted = (rows || []).map((s: any) => ({
          id: s.id,
          name: s.name || 'Unknown Staff',
          role: s.role,
          status: 'on_duty',
          phone: '+1 234 567 890',
          email: s.email,
        }));

        return new Response(JSON.stringify(formatted), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        console.error('[StaffPlugin] Failed to fetch staff:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
      }
    },
  });

  api.logger.info('Staff Roster Plugin initialized successfully');
}
