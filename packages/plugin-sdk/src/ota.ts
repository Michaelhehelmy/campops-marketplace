/**
 * OTA adapter types & registry – Phase 5
 * ──────────────────────────────────────
 * Re-exported from the canonical types module for convenience,
 * plus a singleton registry for adapters.
 */

import type { OTAAdapter } from './types.js';

/**
 * OTAAdapterRegistry
 * ──────────────────
 * A central registry for OTA adapters. Plugins register their adapters here
 * during initialization so the core OtaSyncQueue can discover them.
 */
export const OTAAdapterRegistry = {
  adapters: new Map<string, OTAAdapter>(),

  register(adapter: OTAAdapter) {
    this.adapters.set(adapter.id, adapter);
  },

  get(id: string): OTAAdapter | undefined {
    return this.adapters.get(id);
  },

  getAll(): OTAAdapter[] {
    return Array.from(this.adapters.values());
  },
};

export type {
  RoomMapping,
  RateMapping,
  ChannelReservation,
  OTAAdapter,
  InventorySyncResult,
  RateSyncResult,
} from './types.js';
