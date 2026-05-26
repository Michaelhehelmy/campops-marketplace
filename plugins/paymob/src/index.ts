import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { registerRoutes } from './api/routes.js';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[paymob] Initialising Paymob payment gateway...');

  const tableSql = `
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    order_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'EGP',
    status TEXT DEFAULT 'pending',
    payment_key TEXT,
    transaction_id TEXT,
    payment_method TEXT,
    card_last_four TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  `;

  const exists = await api.db.tableExists('transactions');
  if (!exists) {
    await api.db.createTable('transactions', tableSql);
    api.logger.info('[paymob] Created plugin_paymob_transactions table');
  }

  api.registerHook('payment:collect_methods', async (data: any) => {
    const methods = Array.isArray(data.methods) ? data.methods : [];
    return {
      ...data,
      methods: [...methods, { id: 'paymob', name: 'Paymob', type: 'iframe' }],
    };
  });

  api.registerHook('payment:success', async (data: any) => {
    if (data.gateway === 'paymob') {
      api.logger.info(`[paymob] Payment success for booking ${data.bookingId}`);
    }
    return data;
  });

  registerRoutes(api);

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_paymob_tx_booking ON plugin_paymob_transactions(booking_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_paymob_tx_status ON plugin_paymob_transactions(status)');

  api.logger.info('[paymob] Paymob payment gateway ready');
}
