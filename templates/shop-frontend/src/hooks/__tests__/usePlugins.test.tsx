// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/usePlugins.ts
 * Tests plugin management and asset injection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePlugins } from "../usePlugins";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("usePlugins", () => {
  const mockTenant = {
    id: "tenant-123",
    name: "Test Camp",
    slug: "test-camp",
    subdomain: "test",
    branding: {},
    theme: {},
    features: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  afterEach(() => {
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  it("returns loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => usePlugins(mockTenant));

    expect(result.current.loading).toBe(true);
    expect(result.current.plugins).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("fetches plugins for tenant", async () => {
    const mockPlugins = {
      plugins: [
        {
          plugin_name: "test-plugin",
          display_name: "Test Plugin",
          installed_version: "1.0.0",
          config: {},
          assets: [],
          feature_flags: {},
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlugins,
    });

    const { result } = renderHook(() => usePlugins(mockTenant));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/plugins?propertyId=tenant-123"),
      expect.objectContaining({
        headers: { Accept: "application/json" },
        mode: "cors",
      })
    );

    expect(result.current.plugins).toEqual(mockPlugins.plugins);
    expect(result.current.error).toBeNull();
  });

  it("handles empty plugins response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: [] }),
    });

    const { result } = renderHook(() => usePlugins(mockTenant));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plugins).toEqual([]);
  });

  it("handles 404 response (no plugins)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => usePlugins(mockTenant));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plugins).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePlugins(mockTenant));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.plugins).toEqual([]);
  });

  it("returns empty plugins when tenant is null", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: [] }),
    });

    const { result } = renderHook(() => usePlugins(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plugins).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("can refetch plugins", async () => {
    const mockPlugins = {
      plugins: [
        { plugin_name: "test", display_name: "Test", config: {}, assets: [], feature_flags: {} },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPlugins,
    });

    const { result } = renderHook(() => usePlugins(mockTenant));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockClear();

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
