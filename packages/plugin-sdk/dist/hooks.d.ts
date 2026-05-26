/**
 * Pre-defined hook names used by the SinaiCamps core system.
 * Plugins may register on these or define their own string literals.
 *
 * Keep in sync with server/lib/hooks.ts until the server imports from this SDK.
 */
export declare const Hooks: {
    readonly PRICING_CALCULATE: "pricing:calculate";
    readonly FOLIO_PRE_ADD_CHARGE: "folio:pre_add_charge";
    readonly PAYMENT_ON_SUCCESS: "payment:success";
    readonly PAYMENT_COLLECT_METHODS: "payment:collect_methods";
    readonly RESERVATION_AFTER_CREATE: "reservation:after_create";
    readonly RESERVATION_AFTER_CANCEL: "reservation:after_cancel";
    readonly POS_ORDER_COMPLETED: "pos:order_completed";
    readonly GUEST_CHECKED_OUT: "CHECKOUT_COMPLETED";
    readonly GUEST_REVIEWED: "guest:reviewed";
    readonly NOTIFICATION_SEND: "notification:send";
    readonly ADMIN_MENU_ITEMS: "admin:menu_items";
    readonly PUBLIC_FOOTER_SECTIONS: "public:footer_sections";
};
export type HookName = (typeof Hooks)[keyof typeof Hooks];
//# sourceMappingURL=hooks.d.ts.map