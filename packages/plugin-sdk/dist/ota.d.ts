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
export declare const OTAAdapterRegistry: {
    adapters: Map<string, OTAAdapter>;
    register(adapter: OTAAdapter): void;
    get(id: string): OTAAdapter | undefined;
    getAll(): OTAAdapter[];
};
export type { RoomMapping, RateMapping, ChannelReservation, OTAAdapter, InventorySyncResult, RateSyncResult, } from './types.js';
//# sourceMappingURL=ota.d.ts.map