import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { campaignRouter } from './routes/campaigns.js';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[marketing-automation] Initializing Marketing Automation Plugin');

  await api.db.createTable(
    'campaigns',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'draft',
    scheduled_at INTEGER,
    sent_at INTEGER,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    recipient_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'segments',
    `
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    name TEXT NOT NULL,
    criteria TEXT,
    member_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'automation_triggers',
    `
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    trigger_event TEXT NOT NULL,
    delay_minutes INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
    `
  );

  api.registerRoute('/api/p/marketing', campaignRouter(api));

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_mktg_campaigns_listing ON plugin_marketing_automation_campaigns(listing_id, status)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_mktg_triggers_event ON plugin_marketing_automation_automation_triggers(trigger_event, is_active)');

  api.registerHook('BOOKING_CREATED', async (data: any) => {
    api.logger.info('[marketing-automation] Booking created — checking automation triggers');
    // Auto-trigger welcome campaign
    const triggers = await api.db.query(
      "SELECT * FROM plugin_marketing_automation_automation_triggers WHERE trigger_event = 'booking.created' AND is_active = 1"
    );
    for (const trigger of triggers as any[]) {
      api.logger.info(`[marketing-automation] Triggering campaign ${trigger.campaign_id} from booking event`);
    }
    return data;
  });

  api.ui.addSlotComponent('dashboard.widgets', 'marketing-automation:CampaignPerformanceWidget');

  api.logger.info('[marketing-automation] Plugin initialized successfully');
}
