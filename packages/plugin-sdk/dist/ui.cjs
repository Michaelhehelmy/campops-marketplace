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
var ui_exports = {};
__export(ui_exports, {
  UISlots: () => UISlots
});
module.exports = __toCommonJS(ui_exports);
const UISlots = {
  // Admin Dashboard
  NAV_MAIN: "nav.main",
  DASHBOARD_TOP: "dashboard.top",
  DASHBOARD_MIDDLE: "dashboard.middle",
  DASHBOARD_BOTTOM: "dashboard.bottom",
  DASHBOARD_WIDGETS: "dashboard.widgets",
  ADMIN_SETTINGS_TABS: "admin.settings.tabs",
  POS_ACTIONS: "pos.actions",
  HOUSEKEEPING_ROOM_CARD: "housekeeping.room_card",
  RESERVATION_DETAIL: "reservation.detail",
  // Guest Portal
  GUEST_DASHBOARD_CARDS: "guest.dashboard.cards",
  GUEST_BOOKING_DETAIL: "guest.booking.detail",
  GUEST_PROFILE_SECTIONS: "guest.profile.sections",
  // Staff Dashboard
  STAFF_ROSTER_SHIFTS: "staff.roster.shifts",
  STAFF_TASKS_LIST: "staff.tasks.list",
  // Public pages
  PUBLIC_PROPERTY_HERO: "public.property_detail.hero",
  PUBLIC_PROPERTY_AMENITIES: "public.property_detail.amenities",
  PUBLIC_BOOKING_UPSELLS: "public.booking.upsells",
  PUBLIC_FOOTER_LINKS: "public.footer.links"
};
