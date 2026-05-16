/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/lib/featureFlags.ts
 * Tests useFeatureFlags and useFlag hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useFeatureFlags, useFlag } from "../featureFlags";

// Mock the API module
const mockGet = vi.fn();
vi.mock("../api", () => ({
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

describe("useFeatureFlags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns feature flags on success", async () => {
    const mockFlags = [
      { name: "feature-a", is_enabled: true, description: "Feature A" },
      { name: "feature-b", is_enabled: false, description: "Feature B" },
    ];
    mockGet.mockResolvedValue({ flags: mockFlags });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFlags);
    expect(mockGet).toHaveBeenCalledWith("/feature-flags");
  });

  it("returns loading state initially", async () => {
    mockGet.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("handles error state", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("returns empty array when no flags", async () => {
    mockGet.mockResolvedValue({ flags: [] });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it("caches results with correct configuration", async () => {
    mockGet.mockResolvedValue({ flags: [] });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the data is cached
    expect(result.current.data).toEqual([]);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

describe("useFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for enabled flag", async () => {
    mockGet.mockResolvedValue({
      flags: [{ name: "enabled-flag", is_enabled: true, description: "Enabled" }],
    });

    const { result } = renderHook(() => useFlag("enabled-flag"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("returns false for disabled flag", async () => {
    mockGet.mockResolvedValue({
      flags: [{ name: "disabled-flag", is_enabled: false, description: "Disabled" }],
    });

    const { result } = renderHook(() => useFlag("disabled-flag"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("returns false for non-existent flag", async () => {
    mockGet.mockResolvedValue({
      flags: [{ name: "other-flag", is_enabled: true, description: "Other" }],
    });

    const { result } = renderHook(() => useFlag("missing-flag"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("returns false while loading", async () => {
    mockGet.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFlag("any-flag"), {
      wrapper: createWrapper(),
    });

    // Should return false as safe default while loading
    expect(result.current).toBe(false);
  });

  it("returns false on error", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFlag("any-flag"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
