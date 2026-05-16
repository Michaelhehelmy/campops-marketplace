/**
 * iCal Import Adapter Plugin
 * ──────────────────────────
 * Wraps iCal sync logic as an OTAAdapter so the core OtaSyncQueue can call it
 * through a standardized interface.
 */

import type { PluginAPI } from '@campops/plugin-sdk';
import type {
  OTAAdapter,
  RoomMapping,
  RateMapping,
  ChannelReservation,
  InventorySyncResult,
  RateSyncResult,
} from '../../../packages/plugin-sdk/src/ota.js';
import { OTAAdapterRegistry } from '../../../packages/plugin-sdk/src/ota.js';

class ICalImportAdapter implements OTAAdapter {
  readonly id = 'ical';
  readonly name = 'iCal Import (Airbnb / VRBO)';

  constructor(private api: PluginAPI) {}

  async syncInventory(_roomMappings: RoomMapping[]): Promise<InventorySyncResult> {
    return { updated: 0, errors: ['iCal adapter is read-only; use ical export route for push'] };
  }

  async syncRates(_rateMappings: RateMapping[]): Promise<RateSyncResult> {
    return { updated: 0, errors: ['iCal adapter does not support rate sync'] };
  }

  async fetchReservations(since: Date): Promise<ChannelReservation[]> {
    this.api.logger.info(`[ical-import] Triggering external sync since ${since.toISOString()}`);
    // Trigger the ical plugin's sync hook
    await this.api.executeHook('ical.sync_requested', { since });
    return []; // Side-effectful upsert handled by the ical plugin
  }

  async cancelReservation(channelRef: string): Promise<void> {
    await this.api.db.execute(
      `UPDATE reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE external_uid = $1 AND source = 'ical'`,
      [channelRef]
    );
  }
}

export default async function init(api: PluginAPI): Promise<void> {
  const adapter = new ICalImportAdapter(api);
  OTAAdapterRegistry.register(adapter);

  api.registerHook(
    'ical.sync_requested',
    async (data) => {
      api.logger.info('[ical-import] Processing ical.sync_requested hook...');
      // This plugin can act as a secondary handler if needed,
      // but primarily the 'ical' plugin handles the fetch logic.
      return data;
    },
    20
  );

  api.logger.info(`[ical-import] Registered OTAAdapter: ${adapter.name}`);
}
