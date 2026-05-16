// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useGuests.ts
 * Tests guest management hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useMyProfile,
  useGuests,
  useGuest,
  useUpdateGuest,
  useUpdateMyProfile,
} from "../queries/useGuests";

// Mock the API module
const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  get: (...args: any[]) => mockGet(...args),
  put: (...args: any[]) => mockPut(...args),
  patch: (...args: any[]) => mockPatch(...args),
}));

// Mock react-hot-toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
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

describe("useMyProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches current user's profile", async () => {
    const mockGuest = {
      data: {
        id: "guest-123",
        full_name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
      },
    };

    mockGet.mockResolvedValue(mockGuest);

    const { result } = renderHook(() => useMyProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/guests/me");
    expect(result.current.data).toEqual(mockGuest.data);
  });
});

describe("useGuests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all guests for admin", async () => {
    const mockGuests = {
      data: [
        { id: "guest-1", full_name: "John Doe", email: "john@example.com" },
        { id: "guest-2", full_name: "Jane Smith", email: "jane@example.com" },
      ],
      total: 2,
    };

    mockGet.mockResolvedValue(mockGuests);

    const { result } = renderHook(() => useGuests(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/guests");
    expect(result.current.data).toEqual(mockGuests.data);
  });
});

describe("useGuest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single guest by ID", async () => {
    const mockGuest = {
      data: {
        id: "guest-123",
        full_name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
      },
    };

    mockGet.mockResolvedValue(mockGuest);

    const { result } = renderHook(() => useGuest("guest-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/guests/guest-123");
    expect(result.current.data).toEqual(mockGuest.data);
  });

  it("does not fetch when ID is empty", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useGuest(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useUpdateGuest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates guest profile and shows success toast", async () => {
    const mockGuest = {
      data: {
        id: "guest-123",
        full_name: "John Updated",
        email: "john@example.com",
      },
    };

    mockPut.mockResolvedValue(mockGuest);

    const { result } = renderHook(() => useUpdateGuest(), {
      wrapper: createWrapper(),
    });

    const updateData = { full_name: "John Updated" };

    await result.current.mutateAsync({ id: "guest-123", data: updateData });

    expect(mockPut).toHaveBeenCalledWith("/guests/guest-123", updateData);
    expect(mockToastSuccess).toHaveBeenCalledWith("Profile updated successfully");
  });

  it("shows error toast on failure", async () => {
    mockPut.mockRejectedValue({
      response: { data: { error: "Update failed" } },
    });

    const { result } = renderHook(() => useUpdateGuest(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({ id: "guest-123", data: {} });
    } catch (e) {
      // Expected to throw
    }

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Update failed");
    });
  });
});

describe("useUpdateMyProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates current user profile", async () => {
    const mockGuest = {
      data: {
        id: "guest-123",
        full_name: "John Updated",
        email: "john@example.com",
      },
    };

    mockPatch.mockResolvedValue(mockGuest);

    const { result } = renderHook(() => useUpdateMyProfile(), {
      wrapper: createWrapper(),
    });

    const updateData = { full_name: "John Updated" };

    await result.current.mutateAsync(updateData);

    expect(mockPatch).toHaveBeenCalledWith("/guests/me", updateData);
    expect(mockToastSuccess).toHaveBeenCalledWith("Profile updated successfully");
  });

  it("shows error toast on failure", async () => {
    mockPatch.mockRejectedValue({
      response: { data: { error: "Profile update failed" } },
    });

    const { result } = renderHook(() => useUpdateMyProfile(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({});
    } catch (e) {
      // Expected to throw
    }

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Profile update failed");
    });
  });
});
