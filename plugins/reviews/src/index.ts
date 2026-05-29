import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { registerRoutes } from './api/routes.js';

export default async function init(api: PluginAPI): Promise<void> {
  await api.db.createTable(
    'reviews',
    `id TEXT PRIMARY KEY,
     booking_id TEXT NOT NULL,
     listing_id TEXT NOT NULL,
     guest_id TEXT NOT NULL,
     rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
     title TEXT DEFAULT '',
     comment TEXT NOT NULL,
     is_verified INTEGER DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL`
  );

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_reviews_listing ON plugin_reviews_reviews(listing_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_reviews_booking ON plugin_reviews_reviews(booking_id)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_reviews_guest ON plugin_reviews_reviews(guest_id)');

  registerRoutes(api);

  api.logger.info('[reviews] Plugin initialised — table created, routes registered');
}
