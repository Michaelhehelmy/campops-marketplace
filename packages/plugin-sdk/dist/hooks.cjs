"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var hooks_exports = {};
__export(hooks_exports, {
  Hooks: () => Hooks
});
module.exports = __toCommonJS(hooks_exports);
const Hooks = {
  PRICING_CALCULATE: "pricing.calculate",
  FOLIO_PRE_ADD_CHARGE: "folio.pre_add_charge",
  PAYMENT_ON_SUCCESS: "payment.on_success",
  PAYMENT_COLLECT_METHODS: "payment.collect_methods",
  RESERVATION_AFTER_CREATE: "reservations.after_create",
  RESERVATION_AFTER_CANCEL: "reservations.after_cancel",
  POS_ORDER_COMPLETED: "pos.order_completed",
  GUEST_CHECKED_OUT: "guest.checked_out",
  GUEST_REVIEWED: "guest.reviewed",
  NOTIFICATION_SEND: "notification.send",
  ADMIN_MENU_ITEMS: "admin.menu_items",
  PUBLIC_FOOTER_SECTIONS: "public_footer.sections"
};
