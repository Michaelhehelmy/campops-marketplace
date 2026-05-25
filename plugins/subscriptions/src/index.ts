import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { subscriptionRouter } from './routes/subscriptions.js';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[subscriptions] Initializing Subscriptions Plugin');

  await api.db.createTable(
    'plans',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    billing_interval TEXT DEFAULT 'month',
    max_duration INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'subscriptions',
    `
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    listing_id TEXT,
    guest_id TEXT,
    guest_name TEXT,
    guest_email TEXT,
    status TEXT DEFAULT 'active',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancelled_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'invoices',
    `
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    paid_at INTEGER,
    due_date TEXT NOT NULL,
    created_at INTEGER NOT NULL
    `
  );

  api.registerRoute('/api/p/subscriptions', subscriptionRouter(api));

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_subs_subs_guest ON plugin_subscriptions_subscriptions(guest_email, status)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_subs_invoices_sub ON plugin_subscriptions_invoices(subscription_id, due_date)');

  api.registerHook('BOOKING_CREATED', async (data: any) => {
    api.logger.info('[subscriptions] Booking created — checking subscription eligibility');
    return data;
  });

  api.ui.addSlotComponent('dashboard.widgets', 'subscriptions:RecurringRevenueWidget');

  api.logger.info('[subscriptions] Plugin initialized successfully');
}
