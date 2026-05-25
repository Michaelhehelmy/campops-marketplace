/**
 * OTA adapter types & registry – Phase 5
 * ──────────────────────────────────────
 * Re-exported from the canonical types module for convenience,
 * plus a singleton registry for adapters.
 */
/**
 * OTAAdapterRegistry
 * ──────────────────
 * A central registry for OTA adapters. Plugins register their adapters here
 * during initialization so the core OtaSyncQueue can discover them.
 */
export const OTAAdapterRegistry = {
  adapters: new Map(),
  register(adapter) {
    this.adapters.set(adapter.id, adapter);
  },
  get(id) {
    return this.adapters.get(id);
  },
  getAll() {
    return Array.from(this.adapters.values());
  },
};
//# sourceMappingURL=ota.js.map
