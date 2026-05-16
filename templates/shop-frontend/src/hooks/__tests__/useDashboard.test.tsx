// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useDashboard.ts
 * Tests dashboard-related React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useDashboardOverview,
  useRecentActivity,
  useGuestDashboard,
} from "../queries/useDashboard";

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

describe("useDashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches dashboard overview data", async () => {
    const mockOverview = {
      data: {
        totalBookings: 150,
        currentGuests: 45,
        upcomingArrivals: 12,
        availableTents: 8,
        occupancyRate: 85,
      },
    };

    mockGet.mockResolvedValue(mockOverview);

    const { result } = renderHook(() => useDashboardOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/dashboard/overview");
    expect(result.current.data).toEqual(mockOverview);
  });

  it("is enabled by default", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useDashboardOverview(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(mockGet).toHaveBeenCalled();
  });

  it("can be disabled", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useDashboardOverview(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles error state", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useDashboardOverview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe("useRecentActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches recent activity logs", async () => {
    const mockActivity = {
      data: [
        {
          id: "act-1",
          user_id: "user-1",
          user_name: "John Doe",
          action: "created_booking",
          resource_type: "booking",
          created_at: "2024-01-01T12:00:00Z",
        },
        {
          id: "act-2",
          user_id: "user-2",
          user_name: "Jane Smith",
          action: "updated_room",
          resource_type: "room",
          created_at: "2024-01-01T11:30:00Z",
        },
      ],
    };

    mockGet.mockResolvedValue(mockActivity);

    const { result } = renderHook(() => useRecentActivity(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/dashboard/activity");
    expect(result.current.data).toEqual(mockActivity);
  });

  it("handles empty activity list", async () => {
    mockGet.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useRecentActivity(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ data: [] });
  });
});

describe("useGuestDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches guest dashboard data", async () => {
    const mockGuestDashboard = {
      data: {
        points: 250,
        nextStay: {
          id: "stay-1",
          check_in: "2024-02-01",
          check_out: "2024-02-05",
        },
        liveBillTotal: 450.5,
      },
    };

    mockGet.mockResolvedValue(mockGuestDashboard);

    const { result } = renderHook(() => useGuestDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/dashboard/guest");
    expect(result.current.data).toEqual(mockGuestDashboard);
  });

  it("is enabled by default", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useGuestDashboard(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("can be disabled", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useGuestDashboard(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("handles guest with no upcoming stay", async () => {
    const mockGuestDashboard = {
      data: {
        points: 100,
        nextStay: null,
        liveBillTotal: 0,
      },
    };

    mockGet.mockResolvedValue(mockGuestDashboard);

    const { result } = renderHook(() => useGuestDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect((result.current.data as any)?.data?.nextStay).toBeNull();
  });
});
