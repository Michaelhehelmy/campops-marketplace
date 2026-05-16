/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/lib/offlineQueue.ts
 * Tests offline queue service and helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isOnline, queueIfOffline, offlineQueue } from "../offlineQueue";

// Mock the idb module
const mockDB = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  clear: vi.fn(),
  getAllFromIndex: vi.fn(),
};

const mockOpenDB = vi.fn().mockResolvedValue(mockDB);

vi.mock("idb", () => ({
  openDB: (...args: any[]) => mockOpenDB(...args),
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("isOnline", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    // @ts-ignore
    global.navigator = originalNavigator;
  });

  it("returns navigator.onLine when available", () => {
    // @ts-ignore
    global.navigator = { onLine: true };
    expect(isOnline()).toBe(true);

    // @ts-ignore
    global.navigator = { onLine: false };
    expect(isOnline()).toBe(false);
  });

  it("returns true when navigator is undefined", () => {
    // @ts-ignore
    global.navigator = undefined;
    expect(isOnline()).toBe(true);
  });
});

describe("queueIfOffline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset offlineQueue state
    mockOpenDB.mockClear();
  });

  it("executes function immediately when online", async () => {
    // @ts-ignore
    global.navigator = { onLine: true };
    const executeFn = vi.fn().mockResolvedValue({ success: true });

    const result = await queueIfOffline(
      "createOrder",
      "/api/orders",
      "POST",
      { item: "test" },
      executeFn
    );

    expect(executeFn).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("queues mutation when offline", async () => {
    // @ts-ignore
    global.navigator = { onLine: false };
    mockDB.put.mockResolvedValue(undefined);

    const executeFn = vi.fn().mockResolvedValue({ success: true });

    const result = await queueIfOffline(
      "createOrder",
      "/api/orders",
      "POST",
      { item: "test" },
      executeFn
    );

    expect(executeFn).not.toHaveBeenCalled();
    expect(result).toHaveProperty("queued", true);
    expect(result).toHaveProperty("id");
    expect(mockToast).toHaveBeenCalledWith({
      title: "Queued for Sync",
      description: "Changes will sync when you're back online",
    });
  });
});

describe("OfflineQueueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the db instance before each test
    (offlineQueue as any).db = null;
    (offlineQueue as any).isSyncing = false;
    (offlineQueue as any).syncCallbacks.clear();
  });

  describe("init", () => {
    it("initializes the database", async () => {
      await offlineQueue.init();
      expect(mockOpenDB).toHaveBeenCalledWith("app-offline-queue", 1, expect.any(Object));
    });

    it("does not reinitialize if db exists", async () => {
      await offlineQueue.init();
      await offlineQueue.init();
      expect(mockOpenDB).toHaveBeenCalledTimes(1);
    });
  });

  describe("queueMutation", () => {
    beforeEach(async () => {
      mockDB.put.mockResolvedValue(undefined);
      await offlineQueue.init();
    });

    it("queues a mutation and returns id", async () => {
      const id = await offlineQueue.queueMutation("createOrder", "/api/orders", "POST", {
        item: "test",
      });

      expect(id).toMatch(/^createOrder-\d+-/);
      expect(mockDB.put).toHaveBeenCalledWith("mutations", expect.any(Object));
      expect(mockToast).toHaveBeenCalledWith({
        title: "Queued for Sync",
        description: "Changes will sync when you're back online",
      });
    });

    it("throws error on queue failure", async () => {
      mockDB.put.mockRejectedValue(new Error("DB error"));

      await expect(
        offlineQueue.queueMutation("createOrder", "/api/orders", "POST", {})
      ).rejects.toThrow("DB error");
    });
  });

  describe("getAllMutations", () => {
    beforeEach(async () => {
      await offlineQueue.init();
    });

    it("returns all mutations sorted by createdAt", async () => {
      const mockMutations = [
        { id: "1", type: "createOrder", createdAt: 1000 },
        { id: "2", type: "updateOrderStatus", createdAt: 2000 },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mockMutations);

      const result = await offlineQueue.getAllMutations();

      expect(result).toEqual(mockMutations);
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith("mutations", "byCreatedAt");
    });
  });

  describe("getPendingCount", () => {
    beforeEach(async () => {
      await offlineQueue.init();
    });

    it("returns the count of pending mutations", async () => {
      mockDB.count.mockResolvedValue(5);

      const result = await offlineQueue.getPendingCount();

      expect(result).toBe(5);
      expect(mockDB.count).toHaveBeenCalledWith("mutations");
    });
  });

  describe("removeMutation", () => {
    beforeEach(async () => {
      mockDB.delete.mockResolvedValue(undefined);
      await offlineQueue.init();
    });

    it("removes a mutation by id", async () => {
      await offlineQueue.removeMutation("mutation-1");

      expect(mockDB.delete).toHaveBeenCalledWith("mutations", "mutation-1");
    });
  });

  describe("updateMutation", () => {
    beforeEach(async () => {
      await offlineQueue.init();
    });

    it("updates a mutation with new values", async () => {
      const existingMutation = {
        id: "mutation-1",
        type: "createOrder",
        retryCount: 0,
      };
      mockDB.get.mockResolvedValue(existingMutation);
      mockDB.put.mockResolvedValue(undefined);

      await offlineQueue.updateMutation("mutation-1", { retryCount: 1 });

      expect(mockDB.put).toHaveBeenCalledWith("mutations", {
        ...existingMutation,
        retryCount: 1,
      });
    });

    it("does nothing if mutation not found", async () => {
      mockDB.get.mockResolvedValue(undefined);

      await offlineQueue.updateMutation("non-existent", { retryCount: 1 });

      expect(mockDB.put).not.toHaveBeenCalled();
    });
  });

  describe("clearAll", () => {
    beforeEach(async () => {
      mockDB.clear.mockResolvedValue(undefined);
      await offlineQueue.init();
    });

    it("clears all mutations", async () => {
      await offlineQueue.clearAll();

      expect(mockDB.clear).toHaveBeenCalledWith("mutations");
    });
  });

  describe("onSync", () => {
    it("registers and unregisters callbacks", () => {
      const callback = vi.fn();

      const unsubscribe = offlineQueue.onSync(callback);
      expect((offlineQueue as any).syncCallbacks.has(callback)).toBe(true);

      unsubscribe();
      expect((offlineQueue as any).syncCallbacks.has(callback)).toBe(false);
    });
  });

  describe("sync", () => {
    beforeEach(async () => {
      await offlineQueue.init();
      mockFetch.mockReset();
    });

    it("returns early if already syncing", async () => {
      (offlineQueue as any).isSyncing = true;

      const result = await offlineQueue.sync();

      expect(result).toEqual({ success: 0, failed: 0, conflicts: [] });
    });

    it("returns early if no mutations", async () => {
      mockDB.getAllFromIndex.mockResolvedValue([]);

      const result = await offlineQueue.sync();

      expect(result).toEqual({ success: 0, failed: 0, conflicts: [] });
    });

    it("syncs mutations successfully", async () => {
      const mutations = [
        {
          id: "mutation-1",
          type: "createOrder",
          endpoint: "/api/orders",
          method: "POST",
          payload: { item: "test" },
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
        },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mutations);
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      mockDB.delete.mockResolvedValue(undefined);

      const result = await offlineQueue.sync();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: "test" }),
      });
    });

    it("handles conflict (409) status", async () => {
      const mutations = [
        {
          id: "mutation-1",
          type: "createOrder",
          endpoint: "/api/orders",
          method: "POST",
          payload: {},
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
        },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mutations);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: "Conflict",
      });
      mockDB.get.mockResolvedValue(mutations[0]);
      mockDB.put.mockResolvedValue(undefined);

      const result = await offlineQueue.sync();

      expect(result.failed).toBe(1);
      expect(result.conflicts).toHaveLength(1);
    });

    it("handles server error with retry", async () => {
      const mutations = [
        {
          id: "mutation-1",
          type: "createOrder",
          endpoint: "/api/orders",
          method: "POST",
          payload: {},
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
        },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mutations);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
      });
      mockDB.get.mockResolvedValue(mutations[0]);
      mockDB.put.mockResolvedValue(undefined);

      const result = await offlineQueue.sync();

      expect(result.failed).toBe(0); // Not failed yet, just retried
      expect(mockDB.put).toHaveBeenCalledWith(
        "mutations",
        expect.objectContaining({
          retryCount: 1,
          error: "Attempt 1 failed: Server Error",
        })
      );
    });

    it("marks as failed after max retries", async () => {
      const mutations = [
        {
          id: "mutation-1",
          type: "createOrder",
          endpoint: "/api/orders",
          method: "POST",
          payload: {},
          retryCount: 2,
          maxRetries: 3,
          createdAt: Date.now(),
        },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mutations);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
      });
      mockDB.get.mockResolvedValue(mutations[0]);
      mockDB.put.mockResolvedValue(undefined);

      const result = await offlineQueue.sync();

      expect(result.failed).toBe(1);
      expect(result.conflicts).toHaveLength(1);
    });

    it("handles network errors with retry", async () => {
      const mutations = [
        {
          id: "mutation-1",
          type: "createOrder",
          endpoint: "/api/orders",
          method: "POST",
          payload: {},
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now(),
        },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mutations);
      mockFetch.mockRejectedValue(new Error("Network error"));
      mockDB.get.mockResolvedValue(mutations[0]);
      mockDB.put.mockResolvedValue(undefined);

      const result = await offlineQueue.sync();

      expect(result.failed).toBe(0); // Not failed yet, just retried
      expect(mockDB.put).toHaveBeenCalledWith(
        "mutations",
        expect.objectContaining({
          retryCount: 1,
        })
      );
    });

    it("marks as conflict after max retries on network error", async () => {
      const mutations = [
        {
          id: "mutation-1",
          type: "createOrder",
          endpoint: "/api/orders",
          method: "POST",
          payload: {},
          retryCount: 2,
          maxRetries: 3,
          createdAt: Date.now(),
        },
      ];
      mockDB.getAllFromIndex.mockResolvedValue(mutations);
      mockFetch.mockRejectedValue(new Error("Network error"));
      mockDB.get.mockResolvedValue(mutations[0]);
      mockDB.put.mockResolvedValue(undefined);

      const result = await offlineQueue.sync();

      expect(result.failed).toBe(1);
      expect(result.conflicts).toHaveLength(1);
    });

    it("notifies sync callbacks", async () => {
      const callback = vi.fn();
      offlineQueue.onSync(callback);

      mockDB.getAllFromIndex.mockResolvedValue([]);

      await offlineQueue.sync();

      // Callback should be called at least once (for 'syncing' or 'done')
      expect(callback).toHaveBeenCalled();
    });
  });
});
