/**
 * SinaiCamps Plugin Starter Kit
 * ───────────────────────────
 * Fork this template to build your own SinaiCamps plugin.
 *
 * GETTING STARTED
 * ---------------
 * 1. Rename "my-plugin" throughout to your plugin id.
 * 2. Add your plugin entry to plugin-manifest.json in the SinaiCamps instance.
 * 3. Run `npm run proxy` to start a local dev proxy against a running instance.
 * 4. Implement your logic in the hook handlers below.
 *
 * DOCS: See DEVELOPER_PORTAL.md in the SinaiCamps repo root.
 */
// ─── Plugin ID ────────────────────────────────────────────────────────────────
const PLUGIN_ID = 'my-plugin';
// ─── Init function ────────────────────────────────────────────────────────────
export default async function init(api) {
  api.logger.info(`[${PLUGIN_ID}] Initialising…`);
  // ── Example 1: React to a payment ──────────────────────────────────────────
  //
  // Fires after every successful payment. Return the (possibly modified) data
  // object to pass it down the hook chain.
  api.registerHook(
    'payment:success',
    async (data) => {
      api.logger.info(
        `[${PLUGIN_ID}] payment:success: guest=${data.guestId} amount=${data.amountUsd}`
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
    'pricing:calculate',
    async (data) => {
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
