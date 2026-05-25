/**
 * Plugin UI SDK
 * ─────────────
 * Type definitions for plugin UI registrations.
 *
 * Plugins may ONLY inject components that satisfy the AllowedComponent type.
 * Attempting to pass an arbitrary component (e.g. a raw <div> wrapper) that
 * does not match any of the allowed prop shapes will produce a TypeScript
 * compile error, enforcing design-system consistency.
 *
 * The allowed prop shapes mirror those exported by @acacia-camp/ui (the
 * shared design-system package). Plugins that import components from that
 * package will always satisfy the type constraint automatically.
 */
// ─── Slot catalogue ───────────────────────────────────────────────────────────
/**
 * Every named injection point in the app.
 * Use these constants as the first argument to `api.ui.registerSlot`.
 */
export const UISlots = {
  // Admin Dashboard
  NAV_MAIN: 'nav.main',
  DASHBOARD_TOP: 'dashboard.top',
  DASHBOARD_MIDDLE: 'dashboard.middle',
  DASHBOARD_BOTTOM: 'dashboard.bottom',
  DASHBOARD_WIDGETS: 'dashboard.widgets',
  ADMIN_SETTINGS_TABS: 'admin.settings.tabs',
  POS_ACTIONS: 'pos.actions',
  HOUSEKEEPING_ROOM_CARD: 'housekeeping.room_card',
  RESERVATION_DETAIL: 'reservation.detail',
  // Guest Portal
  GUEST_DASHBOARD_CARDS: 'guest.dashboard.cards',
  GUEST_BOOKING_DETAIL: 'guest.booking.detail',
  GUEST_PROFILE_SECTIONS: 'guest.profile.sections',
  // Staff Dashboard
  STAFF_ROSTER_SHIFTS: 'staff.roster.shifts',
  STAFF_TASKS_LIST: 'staff.tasks.list',
  // Public pages
  PUBLIC_PROPERTY_HERO: 'public.property_detail.hero',
  PUBLIC_PROPERTY_AMENITIES: 'public.property_detail.amenities',
  PUBLIC_BOOKING_UPSELLS: 'public.booking.upsells',
  PUBLIC_FOOTER_LINKS: 'public.footer.links',
};
//# sourceMappingURL=ui.js.map
