import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { accountingRouter } from './routes/accounting.js';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[accounting] Initializing Accounting Plugin');

  await api.db.createTable(
    'ledger_entries',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    entry_type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    reference_type TEXT,
    reference_id TEXT,
    entry_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'invoices',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    guest_name TEXT,
    guest_email TEXT,
    subtotal REAL NOT NULL,
    tax_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    status TEXT DEFAULT 'draft',
    due_date TEXT,
    paid_at INTEGER,
    created_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'expenses',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    vendor TEXT,
    receipt_url TEXT,
    expense_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
    `
  );

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_acct_ledger_listing ON plugin_accounting_ledger_entries(listing_id, entry_date DESC)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_acct_invoices_listing ON plugin_accounting_invoices(listing_id, status)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_acct_expenses_listing ON plugin_accounting_expenses(listing_id, expense_date DESC)');

  api.registerRoute('/api/p/accounting', accountingRouter(api));

  api.registerHook('BOOKING_CREATED', async (data: any) => {
    // Record revenue when booking is created
    if (data.totalPrice && data.listingId) {
      await api.db.execute(
        `INSERT INTO plugin_accounting_ledger_entries (id, listing_id, entry_type, category, description, amount, entry_date, created_at) VALUES (?, ?, 'revenue', 'booking', ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), data.listingId, `Booking revenue - ${data.bookingId || ''}`, data.totalPrice, new Date().toISOString().split('T')[0], Date.now()]
      );
    }
    return data;
  });

  api.ui.addSlotComponent('dashboard.widgets', 'accounting:FinancialHealthWidget');

  api.logger.info('[accounting] Plugin initialized successfully');
}
