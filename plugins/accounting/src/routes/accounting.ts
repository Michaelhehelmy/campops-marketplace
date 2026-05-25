import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export function accountingRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const listingId = url.searchParams.get('listing_id');
      const entryType = url.searchParams.get('type');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let sql = `SELECT * FROM plugin_accounting_ledger_entries WHERE 1=1`;
      const params: any[] = [];

      if (listingId) { sql += ` AND listing_id = ?`; params.push(listingId); }
      if (entryType) { sql += ` AND entry_type = ?`; params.push(entryType); }
      if (startDate) { sql += ` AND entry_date >= ?`; params.push(startDate); }
      if (endDate) { sql += ` AND entry_date <= ?`; params.push(endDate); }

      sql += ` ORDER BY created_at DESC LIMIT 100`;

      const entries = await api.db.query(sql, params);

      const totalRevenue = entries
        .filter((e: any) => e.entry_type === 'revenue')
        .reduce((s: number, e: any) => s + e.amount, 0);
      const totalExpenses = entries
        .filter((e: any) => e.entry_type === 'expense')
        .reduce((s: number, e: any) => s + e.amount, 0);

      return new Response(JSON.stringify({ entries, summary: { totalRevenue, totalExpenses, net: totalRevenue - totalExpenses } }), {
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
        `INSERT INTO plugin_accounting_ledger_entries (id, listing_id, entry_type, category, description, amount, currency, reference_type, reference_id, entry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, body.listing_id, body.entry_type, body.category, body.description || '', body.amount, body.currency || 'USD', body.reference_type || null, body.reference_id || null, body.entry_date || new Date().toISOString().split('T')[0], Date.now()]
      );

      return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    },

    '/summary': {
      GET: async (req: Request) => {
        const session = await api.auth.getSession(req);
        if (!session) return unauthorized();

        const url = new URL(req.url);
        const listingId = url.searchParams.get('listing_id');
        const period = url.searchParams.get('period') || 'month';

        let dateFilter = '';
        if (period === 'month') dateFilter = `AND entry_date >= date('now', '-30 days')`;
        else if (period === 'quarter') dateFilter = `AND entry_date >= date('now', '-90 days')`;
        else if (period === 'year') dateFilter = `AND entry_date >= date('now', '-365 days')`;

        const listingFilter = listingId ? ` AND listing_id = '${listingId}'` : '';

        const revenue = await api.db.queryOne(
          `SELECT COALESCE(SUM(amount), 0) as total FROM plugin_accounting_ledger_entries WHERE entry_type = 'revenue'${dateFilter}${listingFilter}`
        );
        const expenses = await api.db.queryOne(
          `SELECT COALESCE(SUM(amount), 0) as total FROM plugin_accounting_ledger_entries WHERE entry_type = 'expense'${dateFilter}${listingFilter}`
        );

        return new Response(JSON.stringify({
          revenue: (revenue as any)?.total || 0,
          expenses: (expenses as any)?.total || 0,
          net: ((revenue as any)?.total || 0) - ((expenses as any)?.total || 0),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    },
  };
}
