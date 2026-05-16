// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useActivities.ts
 * Tests activities and marketplace hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePublicActivities,
  usePublicActivitySchedules,
  usePublicPOSItems,
  useMarketplaceItems,
} from "../queries/useActivities";

// Mock the API module
const mockGet = vi.fn();

vi.mock("@/lib/api", () => ({
  get: (...args: any[]) => mockGet(...args),
}));

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("usePublicActivities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches public activities", async () => {
    const mockActivities = {
      data: [
        { id: "act-1", name: "Kayaking", description: "Water adventure", price: 50 },
        { id: "act-2", name: "Hiking", description: "Mountain trail", price: 30 },
      ],
    };

    mockGet.mockResolvedValue(mockActivities);

    const { result } = renderHook(() => usePublicActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/public/activities");
    expect(result.current.data).toEqual(mockActivities.data);
  });

  it("handles empty activities list", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => usePublicActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe("usePublicActivitySchedules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches schedules without date filters", async () => {
    const mockSchedules = {
      data: [
        {
          id: "sched-1",
          activity_name: "Kayaking",
          activity_description: "Water adventure",
          base_price: 50,
          duration_minutes: 120,
          activity_category: "water",
          scheduled_date: "2024-06-01",
          available_spots: 10,
        },
      ],
    };

    mockGet.mockResolvedValue(mockSchedules);

    const { result } = renderHook(() => usePublicActivitySchedules(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/public/activity_schedules");
    expect(result.current.data).toEqual(mockSchedules.data);
  });

  it("fetches schedules with date range filters", async () => {
    const mockSchedules = { data: [] };

    mockGet.mockResolvedValue(mockSchedules);

    const { result } = renderHook(
      () =>
        usePublicActivitySchedules({
          start_date: "2024-06-01",
          end_date: "2024-06-30",
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/public/activity_schedules?"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("start_date=2024-06-01"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("end_date=2024-06-30"));
  });

  it("fetches schedules with only start_date", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(
      () =>
        usePublicActivitySchedules({
          start_date: "2024-06-01",
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("start_date=2024-06-01"));
    expect(mockGet).not.toHaveBeenCalledWith(expect.stringContaining("end_date"));
  });
});

describe("usePublicPOSItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches POS items without category filter", async () => {
    const mockItems = {
      data: [
        { id: "item-1", name: "T-shirt", price: 25, category: "retail" },
        { id: "item-2", name: "Hat", price: 15, category: "retail" },
      ],
    };

    mockGet.mockResolvedValue(mockItems);

    const { result } = renderHook(() => usePublicPOSItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/public/pos_items");
    expect(result.current.data).toEqual(mockItems.data);
  });

  it("fetches POS items with category filter", async () => {
    const mockItems = {
      data: [{ id: "item-1", name: "Burger", price: 12, category: "food" }],
    };

    mockGet.mockResolvedValue(mockItems);

    const { result } = renderHook(() => usePublicPOSItems({ category: "food" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/public/pos_items?"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("category=food"));
  });
});

describe("useMarketplaceItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches retail category items successfully", async () => {
    const mockItems = {
      data: [
        { id: "item-1", name: "T-shirt", price: 25, category: "retail" },
        { id: "item-2", name: "Mug", price: 10, category: "retail" },
      ],
    };

    mockGet.mockResolvedValue(mockItems);

    const { result } = renderHook(() => useMarketplaceItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/public/pos_items?category=retail");
    expect(result.current.data).toEqual(mockItems.data);
  });

  it("falls back to all items when retail category fails", async () => {
    const mockItems = {
      data: [
        { id: "item-1", name: "T-shirt", price: 25 },
        { id: "item-2", name: "Burger", price: 12 },
      ],
    };

    // First call fails, second call succeeds
    mockGet.mockRejectedValueOnce(new Error("Category not found")).mockResolvedValueOnce(mockItems);

    const { result } = renderHook(() => useMarketplaceItems(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenNthCalledWith(1, "/public/pos_items?category=retail");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/public/pos_items");
    expect(result.current.data).toEqual(mockItems.data);
  });
});
