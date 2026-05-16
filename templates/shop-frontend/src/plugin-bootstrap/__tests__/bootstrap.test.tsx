/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ICalSyncWidget, bootstrapICal } from "../ical";
import { LoyaltyStatusWidget, bootstrapLoyalty } from "../loyalty";
import { SiteMinderStatusWidget, bootstrapSiteMinder } from "../siteminder";
import { componentRegistry } from "@/lib/ComponentRegistry";

vi.mock("@/lib/ComponentRegistry", () => ({
  componentRegistry: {
    register: vi.fn(),
  },
}));

describe("ical bootstrap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders ICalSyncWidget", () => {
    render(<ICalSyncWidget />);
    expect(screen.getByText("iCal Sync Status")).toBeInTheDocument();
    expect(screen.getByText("Airbnb Feed")).toBeInTheDocument();
    expect(screen.getByText("Booking.com")).toBeInTheDocument();
  });

  it("bootstrapICal registers the component", () => {
    bootstrapICal();
    expect(componentRegistry.register).toHaveBeenCalledWith("ical:ICalSyncWidget", ICalSyncWidget);
  });
});

describe("loyalty bootstrap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders LoyaltyStatusWidget", () => {
    render(<LoyaltyStatusWidget />);
    expect(screen.getByText("Beats Loyalty")).toBeInTheDocument();
    expect(screen.getByText("12,450")).toBeInTheDocument();
  });

  it("bootstrapLoyalty registers the component", () => {
    bootstrapLoyalty();
    expect(componentRegistry.register).toHaveBeenCalledWith(
      "loyalty:LoyaltyStatusWidget",
      LoyaltyStatusWidget
    );
  });
});

describe("siteminder bootstrap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders SiteMinderStatusWidget", () => {
    render(<SiteMinderStatusWidget />);
    expect(screen.getByText("SiteMinder")).toBeInTheDocument();
  });

  it("bootstrapSiteMinder registers the component", () => {
    bootstrapSiteMinder();
    expect(componentRegistry.register).toHaveBeenCalledWith(
      "siteminder:SiteMinderStatusWidget",
      SiteMinderStatusWidget
    );
  });
});
