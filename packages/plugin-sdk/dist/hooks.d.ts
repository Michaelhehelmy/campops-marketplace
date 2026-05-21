/**
 * Pre-defined hook names used by the SinaiCamps core system.
 * Plugins may register on these or define their own string literals.
 *
 * Keep in sync with server/lib/hooks.ts until the server imports from this SDK.
 */
export declare const Hooks: {
    readonly PRICING_CALCULATE: "pricing.calculate";
    readonly FOLIO_PRE_ADD_CHARGE: "folio.pre_add_charge";
    readonly PAYMENT_ON_SUCCESS: "payment.on_success";
    readonly PAYMENT_COLLECT_METHODS: "payment.collect_methods";
    readonly RESERVATION_AFTER_CREATE: "reservations.after_create";
    readonly RESERVATION_AFTER_CANCEL: "reservations.after_cancel";
    readonly POS_ORDER_COMPLETED: "pos.order_completed";
    readonly GUEST_CHECKED_OUT: "guest.checked_out";
    readonly GUEST_REVIEWED: "guest.reviewed";
    readonly NOTIFICATION_SEND: "notification.send";
    readonly ADMIN_MENU_ITEMS: "admin.menu_items";
    readonly PUBLIC_FOOTER_SECTIONS: "public_footer.sections";
};
export type HookName = (typeof Hooks)[keyof typeof Hooks];
//# sourceMappingURL=hooks.d.ts.map