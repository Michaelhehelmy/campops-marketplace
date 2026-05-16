// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useOrders.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePosItems,
  useOrders,
  useKitchenOrders,
  useCreateOrder,
  useUpdateOrderStatus,
} from "../queries/useOrders";

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api", () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
  patch: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
}));

vi.mock("@/lib/offlineQueue", () => ({
  queueIfOffline: vi.fn((type, endpoint, method, data, fn) => fn()),
  offlineQueue: {
    getPendingCount: vi.fn().mockResolvedValue(0),
    sync: vi.fn().mockResolvedValue(undefined),
    onSync: vi.fn(() => () => {}),
  },
}));

vi.mock("@/lib/queryClient", () => ({
  queryKeys: {
    posItems: ["posItems"],
    orders: ["orders"],
    kitchenOrders: ["kitchenOrders"],
    order: (id: string) => ["orders", id],
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useOrders Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.skip("refetches every 30 seconds", async () => {
    vi.useFakeTimers();
    mockGet.mockResolvedValue({ data: [], total: 0 });

    const { result } = renderHook(() => useKitchenOrders(), {
      wrapper: createWrapper(),
    });

    // Initial fetch
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 1000 });
    const callsBefore = mockGet.mock.calls.length;

    // Advance time
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Switch to real timers so waitFor can work
    vi.useRealTimers();

    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it("fetches kitchen orders", async () => {
    mockGet.mockResolvedValue({ data: [], total: 0 });
    const { result } = renderHook(() => useKitchenOrders(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("requires_preparation=true"));
  });

  it("invalidates orders queries on success", async () => {
    const mockOrder = { id: "order-123", status: "placed" };
    mockPost.mockResolvedValue({ data: mockOrder });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateOrder(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ items: [] });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as any).queryKey);
    expect(invalidatedKeys.some((key) => key[0] === "orders")).toBe(true);
    expect(invalidatedKeys.some((key) => key[0] === "kitchenOrders")).toBe(true);
  });

  it("fetches POS items", async () => {
    mockGet.mockResolvedValue({ data: [{ id: "1", name: "Coffee" }], total: 1 });
    const { result } = renderHook(() => usePosItems(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledWith("/pos");
  });

  it("fetches orders with filters", async () => {
    mockGet.mockResolvedValue({ data: [], total: 0 });
    const { result } = renderHook(() => useOrders({ status: "ready", guest_id: "guest-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=ready"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("guest_id=guest-1"));
  });

  it("updates order status", async () => {
    const { patch } = await import("@/lib/api");
    const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: "order-1", status: "preparing" });
    });

    expect(patch).toHaveBeenCalledWith("/orders/order-1/status", { status: "preparing" });
  });

  it("syncs offline queue when coming online", async () => {
    const { offlineQueue } = await import("@/lib/offlineQueue");
    (offlineQueue.getPendingCount as any).mockResolvedValue(1);

    renderHook(() => useCreateOrder(), { wrapper: createWrapper() });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(offlineQueue.sync).toHaveBeenCalled();
    });
  });
});
