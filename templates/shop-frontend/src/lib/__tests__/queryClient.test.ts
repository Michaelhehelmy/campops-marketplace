/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { queryClient, queryKeys } from "../queryClient";

describe("queryClient", () => {
  it("should be defined", () => {
    expect(queryClient).toBeDefined();
  });

  it("should have default query options configured", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries).toBeDefined();
    expect(defaultOptions.mutations).toBeDefined();
  });

  it("should have staleTime of 30 seconds", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(30000);
  });

  it("should have gcTime of 5 minutes", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.gcTime).toBe(300000);
  });

  it("should have retry function configured", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(typeof defaultOptions.queries?.retry).toBe("function");
  });

  it("should not retry on 401 errors", () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
    const error = new Error("Unauthorized") as Error & { status?: number };
    error.status = 401;

    const shouldRetry = retryFn(1, error);
    expect(shouldRetry).toBe(false);
  });

  it("should not retry on 403 errors", () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
    const error = new Error("Forbidden") as Error & { status?: number };
    error.status = 403;

    const shouldRetry = retryFn(1, error);
    expect(shouldRetry).toBe(false);
  });

  it("should retry up to 3 times on other errors", () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
    const error = new Error("Network error") as Error & { status?: number };

    expect(retryFn(1, error)).toBe(true);
    expect(retryFn(2, error)).toBe(true);
    expect(retryFn(3, error)).toBe(false);
  });

  it("should have mutations retry disabled", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.mutations?.retry).toBe(false);
  });

  it("should have refetchOnWindowFocus disabled", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });
});

describe("queryKeys", () => {
  it("should export queryKeys object", () => {
    expect(queryKeys).toBeDefined();
    expect(typeof queryKeys).toBe("object");
  });

  it("should have user query key", () => {
    expect(queryKeys.user).toEqual(["user"]);
  });

  it("should have dashboard query key", () => {
    expect(queryKeys.dashboard).toEqual(["dashboard"]);
  });

  it("should have guests query keys", () => {
    expect(queryKeys.guests).toEqual(["guests"]);
    expect(queryKeys.guest("123")).toEqual(["guests", "123"]);
    expect(queryKeys.guestMe()).toEqual(["guests", "me"]);
  });

  it("should have rooms query keys", () => {
    expect(queryKeys.rooms).toEqual(["rooms"]);
    expect(queryKeys.room("456")).toEqual(["rooms", "456"]);
  });

  it("should have reservations query keys", () => {
    expect(queryKeys.reservations).toEqual(["reservations"]);
    expect(queryKeys.reservation("789")).toEqual(["reservations", "789"]);
  });

  it("should have orders query keys", () => {
    expect(queryKeys.orders).toEqual(["orders"]);
    expect(queryKeys.order("abc")).toEqual(["orders", "abc"]);
    expect(queryKeys.posItems).toEqual(["pos_items"]);
    expect(queryKeys.kitchenOrders).toEqual(["orders", "kitchen"]);
  });

  it("should have folios query keys", () => {
    expect(queryKeys.folios).toEqual(["folios"]);
    expect(queryKeys.folio("def")).toEqual(["folios", "def"]);
  });

  it("should have inventory query key", () => {
    expect(queryKeys.inventory).toEqual(["inventory"]);
  });

  it("should have pages query keys", () => {
    expect(queryKeys.pages).toEqual(["pages"]);
    expect(queryKeys.page("page1")).toEqual(["pages", "page1"]);
    expect(queryKeys.pageBySlug("about")).toEqual(["pages", "slug", "about"]);
  });

  it("should have blog query keys", () => {
    expect(queryKeys.blogPosts).toEqual(["blog_posts"]);
    expect(queryKeys.blogPost("post1")).toEqual(["blog_posts", "post1"]);
    expect(queryKeys.blogPostBySlug("hello")).toEqual(["blog_posts", "slug", "hello"]);
  });

  it("should have housekeeping query key", () => {
    expect(queryKeys.housekeepingTasks).toEqual(["housekeeping_tasks"]);
  });

  it("should have shifts query key", () => {
    expect(queryKeys.shifts).toEqual(["shifts"]);
  });

  it("should have activities query keys", () => {
    expect(queryKeys.activities).toEqual(["activities"]);
    expect(queryKeys.activityBookings).toEqual(["activity_bookings"]);
  });

  it("should have loyalty query keys", () => {
    expect(queryKeys.loyaltyTransactions).toEqual(["loyalty_transactions"]);
    expect(queryKeys.miningSession).toEqual(["mining_session"]);
  });

  it("should have pos categories query key", () => {
    expect(queryKeys.posCategories).toEqual(["pos_categories"]);
  });

  it("should have admin rooms query keys", () => {
    expect(queryKeys.adminRooms).toEqual(["admin_rooms"]);
    expect(queryKeys.adminRoom("room1")).toEqual(["admin_rooms", "room1"]);
  });

  it("should have users query keys", () => {
    expect(queryKeys.users).toEqual(["users"]);
    expect(queryKeys.user_admin("user1")).toEqual(["users", "user1"]);
  });

  it("should have roles query key", () => {
    expect(queryKeys.roles).toEqual(["roles"]);
  });

  it("should have rate plans query key", () => {
    expect(queryKeys.ratePlans).toEqual(["rate_plans"]);
  });

  it("should have media query key", () => {
    expect(queryKeys.media).toEqual(["media"]);
  });

  it("should have settings query key", () => {
    expect(queryKeys.settings).toEqual(["settings"]);
  });

  it("should have procurement query key", () => {
    expect(queryKeys.procurement).toEqual(["procurement"]);
  });

  it("should have reports query keys", () => {
    expect(queryKeys.revenueReport("2024-01-01", "2024-01-31")).toEqual([
      "reports",
      "revenue",
      "2024-01-01",
      "2024-01-31",
    ]);
    expect(queryKeys.hospitalityReport(30)).toEqual(["reports", "hospitality", 30]);
    expect(queryKeys.housekeepingPredictions).toEqual(["reports", "predictions", "housekeeping"]);
  });

  it("should have audit logs query key", () => {
    expect(queryKeys.auditLogs).toEqual(["audit_logs"]);
  });

  it("should have feedback query key", () => {
    expect(queryKeys.feedback).toEqual(["guest_feedback"]);
  });

  it("should have webhook logs query key", () => {
    expect(queryKeys.webhookLogs).toEqual(["webhook_logs"]);
  });

  it("should have tax configurations query key", () => {
    expect(queryKeys.taxConfigurations).toEqual(["tax_configurations"]);
  });

  it("should have system info query keys", () => {
    expect(queryKeys.systemInfo).toEqual(["system_info"]);
    expect(queryKeys.systemBackups).toEqual(["system_backups"]);
  });

  it("should have activity schedules query key", () => {
    expect(queryKeys.activitySchedules()).toEqual(["activity_schedules", undefined]);
    expect(queryKeys.activitySchedules("act1")).toEqual(["activity_schedules", "act1"]);
  });

  it("should have staff query keys", () => {
    expect(queryKeys.staffProfile).toEqual(["staff_profile"]);
    expect(queryKeys.staffFinances).toEqual(["staff_finances"]);
    expect(queryKeys.staffAllowanceRequests).toEqual(["staff_allowance_requests"]);
  });

  it("should have public query keys", () => {
    expect(queryKeys.publicRooms).toEqual(["public_rooms"]);
    expect(queryKeys.availability("2024-01-01", "2024-01-10")).toEqual([
      "availability",
      "2024-01-01",
      "2024-01-10",
    ]);
    expect(queryKeys.publicFolio("res1")).toEqual(["public_folio", "res1"]);
  });

  it("should have transport query keys", () => {
    expect(queryKeys.transport.vehicles).toEqual(["transport", "vehicles"]);
    expect(queryKeys.transport.vehicle("v1")).toEqual(["transport", "vehicles", "v1"]);
    expect(queryKeys.transport.drivers).toEqual(["transport", "drivers"]);
    expect(queryKeys.transport.driver("d1")).toEqual(["transport", "drivers", "d1"]);
    expect(queryKeys.transport.transfers).toEqual(["transport", "transfers"]);
    expect(queryKeys.transport.transfer("t1")).toEqual(["transport", "transfers", "t1"]);
  });
});
