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
var ota_exports = {};
__export(ota_exports, {
  OTAAdapterRegistry: () => OTAAdapterRegistry
});
module.exports = __toCommonJS(ota_exports);
const OTAAdapterRegistry = {
  adapters: /* @__PURE__ */ new Map(),
  register(adapter) {
    this.adapters.set(adapter.id, adapter);
  },
  get(id) {
    return this.adapters.get(id);
  },
  getAll() {
    return Array.from(this.adapters.values());
  }
};
