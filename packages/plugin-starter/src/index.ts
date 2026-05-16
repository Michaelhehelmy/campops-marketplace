/**
 * CampOps Plugin Starter Kit
 * ───────────────────────────
 * Fork this template to build your own CampOps plugin.
 *
 * GETTING STARTED
 * ---------------
 * 1. Rename "my-plugin" throughout to your plugin id.
 * 2. Add your plugin entry to plugin-manifest.json in the CampOps instance.
 * 3. Run `npm run proxy` to start a local dev proxy against a running instance.
 * 4. Implement your logic in the hook handlers below.
 *
 * DOCS: See DEVELOPER_PORTAL.md in the CampOps repo root.
 */

import type { PluginAPI } from 'campops-sdk';

// ─── Plugin ID ────────────────────────────────────────────────────────────────

const PLUGIN_ID = 'my-plugin';

// ─── Init function ────────────────────────────────────────────────────────────

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info(`[${PLUGIN_ID}] Initialising…`);

  // ── Example 1: React to a payment ──────────────────────────────────────────
  //
  // Fires after every successful payment. Return the (possibly modified) data
  // object to pass it down the hook chain.
  api.registerHook(
    'payment.on_success',
    async (data: { guestId?: string; amountUsd?: number; paymentId?: string }) => {
      api.logger.info(
        `[${PLUGIN_ID}] payment.on_success: guest=${data.guestId} amount=${data.amountUsd}`
      );
      // TODO: your logic here (e.g. send webhook, award custom points, …)
      return data;
    },
    // priority 50 — runs after core loyalty plugin (priority 20)
    50
  );

  // ── Example 2: Modify pricing ──────────────────────────────────────────────
  //
  // Fires during booking price calculation. You can adjust data.price.
  api.registerHook(
    'pricing.calculate',
    async (data: { price: number; guestId?: string }) => {
      // Example: apply a flat $5 early-bird discount when price > $100
      if (data.price > 100) {
        api.logger.info(`[${PLUGIN_ID}] Applying $5 early-bird discount`);
        return { ...data, price: data.price - 5 };
      }
      return data;
    },
    50
  );

  // ── Example 3: Add a menu item to the admin panel ─────────────────────────
  api.ui.addMenuItem({
    label: 'My Plugin',
    icon: 'plug',
    path: '/admin/my-plugin',
    permission: 'settings.view',
  });

  api.logger.info(`[${PLUGIN_ID}] Ready`);
}
