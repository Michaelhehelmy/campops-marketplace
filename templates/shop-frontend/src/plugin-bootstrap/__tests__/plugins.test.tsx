/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { componentRegistry } from "@/lib/ComponentRegistry";
import { bootstrapLoyalty } from "../loyalty";
import { bootstrapICal } from "../ical";
import { bootstrapSiteMinder } from "../siteminder";

describe("Plugin Bootstraps", () => {
  beforeEach(() => {
    // Clear registry if needed, but here we just check if they register correctly
  });

  it("registers loyalty components", () => {
    bootstrapLoyalty();
    expect(componentRegistry.resolve("loyalty:LoyaltyStatusWidget")).toBeDefined();
  });

  it("registers ical components", () => {
    bootstrapICal();
    expect(componentRegistry.resolve("ical:ICalSyncWidget")).toBeDefined();
  });

  it("registers siteminder components", () => {
    bootstrapSiteMinder();
    expect(componentRegistry.resolve("siteminder:SiteMinderStatusWidget")).toBeDefined();
  });
});
