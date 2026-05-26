/**
 * Pre-defined hook names used by the SinaiCamps core system.
 * Plugins may register on these or define their own string literals.
 *
 * Keep in sync with server/lib/hooks.ts until the server imports from this SDK.
 */
export const Hooks = {
  PRICING_CALCULATE: 'pricing:calculate',
  FOLIO_PRE_ADD_CHARGE: 'folio:pre_add_charge',
  PAYMENT_ON_SUCCESS: 'payment:success',
  PAYMENT_COLLECT_METHODS: 'payment:collect_methods',
  RESERVATION_AFTER_CREATE: 'reservation:after_create',
  RESERVATION_AFTER_CANCEL: 'reservation:after_cancel',
  POS_ORDER_COMPLETED: 'pos:order_completed',
  GUEST_CHECKED_OUT: 'CHECKOUT_COMPLETED',
  GUEST_REVIEWED: 'guest:reviewed',
  NOTIFICATION_SEND: 'notification:send',
  ADMIN_MENU_ITEMS: 'admin:menu_items',
  PUBLIC_FOOTER_SECTIONS: 'public:footer_sections',
};
//# sourceMappingURL=hooks.js.map
