/**
 * PWA Plugin - Reference Implementation
 * ────────────────────────────────────
 * Registers Progressive Web App capabilities as a first-class CampOps plugin.
 */

import type { PluginAPI } from '@campops/plugin-sdk';

export const PLUGIN_ID = 'pwa';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info(`[${PLUGIN_ID}] Initialising PWA plugin reference implementation…`);

  // ── Database Setup ─────────────────────────────────────────────────────────
  // Create settings table for user preferences
  await api.db.createTable(
    'settings',
    `
    key TEXT PRIMARY KEY,
    value TEXT,
    last_updated TIMESTAMP
  `
  );

  // Create subscriptions table for push notifications
  await api.db.createTable(
    'subscriptions',
    `
    guest_id UUID,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    is_active BOOLEAN DEFAULT true
  `
  );

  // ── Hook Registration ──────────────────────────────────────────────────────
  // Register a hook to log when a public page is loaded (for analytics/PWA stats)
  api.registerHook(
    'listing.public_page_loaded',
    async (data) => {
      api.logger.info(`[${PLUGIN_ID}] Page loaded: ${data.path}`);
      return data;
    },
    100
  );

  // ── UI Slot Registration ───────────────────────────────────────────────────
  // Inject the install banner into the listing header
  api.ui.addSlotComponent('listing.header', `${PLUGIN_ID}:PWAInstallBanner`);

  // Inject into dashboard top
  api.ui.addSlotComponent('dashboard.top', `${PLUGIN_ID}:PWAInstallBanner`);

  // ── Settings Page ──────────────────────────────────────────────────────────
  api.ui.addSettingsPage({
    id: `${PLUGIN_ID}-settings`,
    label: 'PWA Settings',
    icon: 'smartphone',
    component: `${PLUGIN_ID}:PWASettingsPage`,
  });

  api.logger.info(`[${PLUGIN_ID}] Reference implementation ready`);
}
