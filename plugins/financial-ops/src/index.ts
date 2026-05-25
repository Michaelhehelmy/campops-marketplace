import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { billingRouter } from './routes/billing.js';

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

  await api.db.createTable(
    'folios',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    guest_name TEXT,
    total_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'folio_charges',
    `
    id TEXT PRIMARY KEY,
    folio_id TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    charge_type TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (folio_id) REFERENCES plugin_folios(id)
    `
  );

  await api.db.createTable(
    'payments',
    `
    id TEXT PRIMARY KEY,
    folio_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (folio_id) REFERENCES plugin_folios(id)
    `
  );

  // Create indexes after table creation
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_finops_comm_booking ON plugin_financial_ops_commissions(booking_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_finops_folios_guest ON plugin_financial_ops_folios(guest_name)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_finops_charges_folio ON plugin_financial_ops_folio_charges(folio_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_finops_payments_folio ON plugin_financial_ops_payments(folio_id)');

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

  // ── GET /api/manage/:listingId/finance ────────────────────────────────────
  // Backward-compatible route for manager finance dashboard
  api.registerRoute('/api/manage/:listingId/finance', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (
          !session ||
          !['manager', 'marketplace_master', 'master'].includes(session.user.role as string)
        ) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
        }

        const url = new URL(req.url);
        const listingId =
          url.searchParams.get(':listingId') ?? url.pathname.split('/').slice(-2)[0];

        let totalRevenue = 0;
        let transactions: any[] = [];

        try {
          const revenueRow = await api.db.queryOne(
            `SELECT SUM(total_price) as total FROM plugin_booking_bookings WHERE listing_id = ? AND status IN ('confirmed','checked-in','checked-out')`,
            [listingId]
          );
          totalRevenue = (revenueRow as any)?.total || 0;

          const txRaw = await api.db.query(
            `SELECT id, total_price, status, created_at FROM plugin_booking_bookings WHERE listing_id = ? AND status IN ('confirmed','checked-in','checked-out') ORDER BY created_at DESC LIMIT 10`,
            [listingId]
          );
          const commissionRateNum = 10.0;
          transactions = (txRaw as any[]).map((b: any) => {
            const gross = b.total_price || 0;
            const fee = (gross * commissionRateNum) / 100;
            return {
              id: b.id,
              date: b.created_at || 'Recent',
              amount: gross,
              fee,
              net: gross - fee,
            };
          });
        } catch (_e1) {
          try {
            const revenueRow = await api.db.queryOne(
              `SELECT SUM(total_price) as total FROM reservations WHERE (property_id = ? OR property_id IN (SELECT id FROM properties WHERE slug = ?)) AND status IN ('confirmed','checked-in')`,
              [listingId, listingId]
            );
            totalRevenue = (revenueRow as any)?.total || 0;
          } catch (_e2) {
            // Neither table exists — use zero defaults
          }
        }

        const commissionRateNum = 10.0;
        const commissionFees = (totalRevenue * commissionRateNum) / 100;
        const netPayouts = totalRevenue - commissionFees;
        const avgBooking = transactions.length > 0 ? totalRevenue / transactions.length : 0;

        return new Response(
          JSON.stringify({
            revenue: { total: totalRevenue, thisMonth: 0 },
            commission: { rate: commissionRateNum, totalPaid: commissionFees },
            stats: {
              totalRevenue: `$${totalRevenue.toLocaleString()}`,
              netPayouts: `$${netPayouts.toLocaleString()}`,
              commissionFees: `$${commissionFees.toLocaleString()}`,
              avgBooking: `$${avgBooking.toLocaleString()}`,
              trends: { revenue: '+12.4%', payouts: '+10.2%', fees: '+12.4%', avg: '+5.1%' },
            },
            transactions,
            commissionRate: `${commissionRateNum}%`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Database error' }), {
          status: 500,
        });
      }
    },
  });

  // Register billing router (Hono-based) at /api/p/finance/billing
  api.registerRoute('/api/p/finance/billing', billingRouter(api));

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
