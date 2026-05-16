import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Financial Operations Plugin...');

  // 1. Create tables
  await api.db.createTable(
    'commissions',
    `
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `
  );

  // 2. Listen to hooks
  api.registerHook('BOOKING_CREATED', async (data: any) => {
    // Basic commission is 10%
    const amount = (data.totalPrice || 0) * 0.1;
    if (amount > 0) {
      await api.db.execute(
        `INSERT INTO plugin_financial_ops_commissions (id, booking_id, listing_id, amount) VALUES (?, ?, ?, ?)`,
        [data.bookingId, data.bookingId, data.listingId || 'unknown', amount]
      );
    }
    return data;
  });

  // 3. API Routes
  api.registerRoute('/api/p/finance/commissions', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session || !['master', 'admin', 'staff'].includes(session.user.role as string)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }

        const url = new URL(req.url);
        const listingId = url.searchParams.get('listing_id');

        let commissions;
        if (session.user.role === 'master') {
          if (listingId) {
            commissions = await api.db.query(
              'SELECT * FROM plugin_financial_ops_commissions WHERE listing_id = ? ORDER BY created_at DESC',
              [listingId]
            );
          } else {
            commissions = await api.db.query(
              'SELECT * FROM plugin_financial_ops_commissions ORDER BY created_at DESC'
            );
          }
        } else {
          // Admin/Staff - must use their header
          const tenantId = req.headers.get('x-tenant-id');
          if (!tenantId) {
            return new Response(JSON.stringify({ error: 'Tenant ID required' }), { status: 400 });
          }
          commissions = await api.db.query(
            'SELECT * FROM plugin_financial_ops_commissions WHERE listing_id = ? ORDER BY created_at DESC',
            [tenantId]
          );
        }

        return new Response(JSON.stringify({ commissions }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  // 4. UI slots
  api.ui.addSlotComponent('master.finance', 'finance:MasterDashboard');
  api.ui.addSlotComponent('manager.finance', 'finance:ManagerDashboard');

  return {};
}
