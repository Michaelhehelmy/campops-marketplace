// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/useTenant.ts
 * Tests tenant resolution and branding functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTenant } from "../useTenant";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
const originalEnv = import.meta.env;

describe("useTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset import.meta.env
    vi.stubEnv("VITE_API_BASE", "https://test-api.com");
    vi.stubEnv("VITE_SHOP_SLUG", "");

    // Mock window.location.hostname
    Object.defineProperty(window, "location", {
      value: {
        hostname: "test-host.com",
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("initial state", () => {
    it("returns loading=true initially", () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useTenant());

      expect(result.current.loading).toBe(true);
      expect(result.current.tenant).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("with VITE_SHOP_SLUG", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_API_BASE", "https://test-api.com");
      vi.stubEnv("VITE_SHOP_SLUG", "my-shop");
    });

    it("fetches tenant by slug", async () => {
      const mockTenant = {
        id: "tenant-123",
        name: "My Shop",
        slug: "my-shop",
        subdomain: "my-shop",
        branding: {
          logo: "/logo.png",
          primaryColor: "#000",
        },
        theme: {
          mode: "light",
        },
        features: { bookings: true },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTenant,
      });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith("https://test-api.com/api/branding?slug=my-shop", {
        headers: { Accept: "application/json" },
        mode: "cors",
      });

      expect(result.current.tenant).toEqual({
        id: "tenant-123",
        name: "My Shop",
        slug: "my-shop",
        subdomain: "my-shop",
        branding: { logo: "/logo.png", primaryColor: "#000" },
        theme: { mode: "light" },
        features: { bookings: true },
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("without VITE_SHOP_SLUG (hostname resolution)", () => {
    it("fetches tenant by hostname", async () => {
      const mockResponse = {
        property: {
          id: "prop-456",
          name: "Test Property",
          slug: "test-property",
          subdomain: "test",
        },
      };

      const mockBranding = {
        name: "Branded Property",
        branding: {
          logo: "/brand-logo.png",
        },
        theme: { mode: "dark" },
        features: { pos: true },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBranding,
        });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "https://test-api.com/api/tenant/resolve?host=test-host.com",
        {
          headers: { Accept: "application/json" },
          mode: "cors",
        }
      );

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://test-api.com/api/branding?propertyId=prop-456",
        { mode: "cors" }
      );

      expect(result.current.tenant).toEqual({
        id: "prop-456",
        name: "Branded Property",
        slug: "test-property",
        subdomain: "test",
        branding: { logo: "/brand-logo.png" },
        theme: { mode: "dark" },
        features: { pos: true },
      });
    });

    it("falls back to basic property info when branding fetch fails", async () => {
      const mockResponse = {
        property: {
          id: "prop-456",
          name: "Test Property",
          slug: "test-property",
          subdomain: "test",
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tenant).toEqual({
        id: "prop-456",
        name: "Test Property",
        slug: "test-property",
        subdomain: "",
        branding: {},
        theme: {},
        features: {},
      });
    });
  });

  describe("error handling", () => {
    it("handles 404 error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Shop not found");
      expect(result.current.tenant).toEqual({
        id: "demo",
        name: "Demo Camp",
        slug: "demo",
        subdomain: "",
        branding: {},
        theme: { mode: "light" },
        features: {},
      });
    });

    it("handles other HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Failed to resolve tenant: 500");
      expect(result.current.tenant).toEqual({
        id: "demo",
        name: "Demo Camp",
        slug: "demo",
        subdomain: "",
        branding: {},
        theme: { mode: "light" },
        features: {},
      });
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Network failure");
      expect(result.current.tenant).toEqual({
        id: "demo",
        name: "Demo Camp",
        slug: "demo",
        subdomain: "",
        branding: {},
        theme: { mode: "light" },
        features: {},
      });
    });

    it("handles invalid response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing both branding and property
      });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Invalid tenant response");
      expect(result.current.tenant).toEqual({
        id: "demo",
        name: "Demo Camp",
        slug: "demo",
        subdomain: "",
        branding: {},
        theme: { mode: "light" },
        features: {},
      });
    });

    it("handles unknown error types", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Unknown error");
    });
  });

  describe("refetch", () => {
    it("can refetch tenant data", async () => {
      const mockTenant = {
        id: "tenant-123",
        name: "My Shop",
        slug: "my-shop",
        subdomain: "my-shop",
        branding: {},
        theme: {},
        features: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTenant,
      });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear mocks to track new calls
      mockFetch.mockClear();

      // Trigger refetch
      result.current.refetch();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("default API base", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_API_BASE", "");
      vi.stubEnv("VITE_SHOP_SLUG", "");
    });

    it("uses default API base when env variable not set", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "tenant-123",
          name: "Test",
          slug: "test",
          subdomain: "test",
          branding: {},
          theme: {},
          features: {},
        }),
      });

      const { result } = renderHook(() => useTenant());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should use default API base
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.sinaicamps.com"),
        expect.any(Object)
      );
    });
  });
});
