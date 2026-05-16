import type { PluginAPI } from '@campops/plugin-sdk';

const PLUGIN_ID = 'listing-admin';

/**
 * Listing Admin Plugin
 * ────────────────────
 * Provides a property-level dashboard for marketplace stats (revenue, fees).
 * This plugin demonstrates the "Stateless Dashboard" pattern by querying
 * core data via the PluginAPI repositories.
 */
export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info(`[${PLUGIN_ID}] Initialising Listing Admin dashboard...`);

  // Register a dashboard widget to show stats in the admin panel
  api.ui.addDashboardWidget({
    id: 'property-stats',
    title: 'Property Performance',
    component: 'StatsWidget',
  });

  // Handle stats calculation via hook
  api.registerHook('dashboard.get_stats', async (data: any) => {
    // Query core reservations via the scoped repository
    const reservations = await api.db.getTable('reservations').findMany();

    const totalRevenue = reservations.reduce(
      (sum: number, res: any) => sum + (res.total_price || 0),
      0
    );
    const totalFees = totalRevenue * 0.12; // 12% standard marketplace fee

    return {
      ...data,
      revenue: totalRevenue,
      fees: totalFees,
      bookingCount: reservations.length,
      netPayout: totalRevenue - totalFees,
    };
  });

  api.logger.info(`[${PLUGIN_ID}] Ready`);
}
