import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { integrationRouter } from './routes/integrations.js';
import { syncRouter } from './routes/sync.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Integrations Plugin');

  await api.db.createTable(
    'external_calendars',
    `
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    ical_url TEXT,
    channel_id TEXT,
    credentials TEXT,
    last_synced_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'integration_logs',
    `
    id TEXT PRIMARY KEY,
    integration_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL,
    payload TEXT,
    error_message TEXT,
    created_at INTEGER NOT NULL
    `
  );

  api.registerRoute('/api/p/integrations/calendars', integrationRouter(api));
  api.registerRoute('/api/p/integrations/sync', syncRouter(api));

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_int_calendars_property ON plugin_integrations_external_calendars(property_id, is_active)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_int_logs_type ON plugin_integrations_integration_logs(integration_type, created_at DESC)');

  api.registerHook('BOOKING_CREATED', async (data: any) => {
    api.logger.info('[integrations] Booking created, queue calendar sync');
    return data;
  });

  api.registerHook('BOOKING_CANCELLED', async (data: any) => {
    api.logger.info('[integrations] Booking cancelled, queue calendar sync');
    return data;
  });

  api.ui.addSlotComponent('manager.settings.integrations', 'integrations:CalendarSyncSettings');

  api.logger.info('Integrations Plugin initialized successfully');
}
