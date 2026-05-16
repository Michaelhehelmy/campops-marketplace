const { SyncWaterfallHook } = require('tapable');

/**
 * Booking Plugin Hooks
 * ────────────────────
 * Tapable hooks for inter-plugin communication
 */
export const hooks = {
  // Emit when a booking is created
  BOOKING_CREATED: new SyncWaterfallHook(['data']),

  // Emit when a guest checks in
  CHECKIN_COMPLETED: new SyncWaterfallHook(['data']),

  // Emit when a guest checks out
  CHECKOUT_COMPLETED: new SyncWaterfallHook(['data']),

  // Emit when a booking is cancelled
  BOOKING_CANCELLED: new SyncWaterfallHook(['data']),
};
