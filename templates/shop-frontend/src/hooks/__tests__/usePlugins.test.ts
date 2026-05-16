// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePlugins } from "../usePlugins";

describe("usePlugins", () => {
  const mockTenant = { id: "test-tenant", name: "Test Tenant", slug: "test" };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Clear injected assets from DOM
    document.querySelectorAll("[data-plugin-asset]").forEach((e) => e.remove());
    document.querySelectorAll("[data-plugin-entry]").forEach((e) => e.remove());
    document.querySelectorAll("[data-plugin-css]").forEach((e) => e.remove());
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array if no tenant is provided", async () => {
    const { result } = renderHook(() => usePlugins(null));
    expect(result.current.plugins).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("fetches and returns plugins for a tenant", async () => {
    const mockPlugins = [
      {
        plugin_name: "test-plugin",
        display_name: "Test Plugin",
        assets: [],
        config: {},
        manifest: {},
      },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: mockPlugins }),
    });

    const { result } = renderHook(() => usePlugins(mockTenant as any));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plugins).toEqual(mockPlugins);
    expect(result.current.error).toBe(null);
  });

  it("handles 404 response by setting empty plugins", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => usePlugins(mockTenant as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plugins).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("handles fetch errors", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePlugins(mockTenant as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plugins).toEqual([]);
    expect(result.current.error).toBe("Failed to fetch plugins: 500");
  });

  it("injects script and stylesheet assets into the DOM", async () => {
    const mockPlugins = [
      {
        plugin_name: "asset-plugin",
        assets: [
          {
            asset_type: "script",
            asset_url: "https://example.com/script.js",
            load_order: 1,
            target_location: "head",
          },
          {
            asset_type: "stylesheet",
            asset_url: "https://example.com/style.css",
            load_order: 2,
          },
        ],
        config: {},
        manifest: {},
      },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: mockPlugins }),
    });

    renderHook(() => usePlugins(mockTenant as any));

    await waitFor(() => {
      const script = document.querySelector('script[src="https://example.com/script.js"]');
      const link = document.querySelector('link[href="https://example.com/style.css"]');
      expect(script).toBeInTheDocument();
      expect(link).toBeInTheDocument();
      expect(script?.parentElement).toBe(document.head);
    });
  });

  it("injects entry_point_url and css_url if present", async () => {
    const mockPlugins = [
      {
        plugin_name: "entry-plugin",
        entry_point_url: "https://example.com/entry.js",
        css_url: "https://example.com/plugin.css",
        assets: [],
        config: { key: "val" },
        manifest: {},
      },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: mockPlugins }),
    });

    renderHook(() => usePlugins(mockTenant as any));

    await waitFor(() => {
      const script = document.querySelector('script[data-plugin-entry="entry-plugin"]');
      const link = document.querySelector('link[data-plugin-css="entry-plugin"]');
      expect(script).toHaveAttribute("src", "https://example.com/entry.js");
      expect(script).toHaveAttribute("data-plugin-config", '{"key":"val"}');
      expect(link).toHaveAttribute("href", "https://example.com/plugin.css");
    });
  });

  it("skips injection if assets are already present", async () => {
    const mockPlugins = [
      {
        plugin_name: "duplicate-plugin",
        entry_point_url: "https://example.com/entry.js",
        assets: [],
        config: {},
        manifest: {},
      },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ plugins: mockPlugins }),
    });

    // Pre-inject
    const existing = document.createElement("script");
    existing.setAttribute("data-plugin-entry", "duplicate-plugin");
    document.body.appendChild(existing);

    const spy = vi.spyOn(document.body, "appendChild");

    renderHook(() => usePlugins(mockTenant as any));

    await waitFor(() => {
      // Should not have appended again
      expect(spy).not.toHaveBeenCalledWith(
        expect.objectContaining({ src: "https://example.com/entry.js" })
      );
    });
  });

  it("supports refetching plugins", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plugins: [] }),
    });

    const { result } = renderHook(() => usePlugins(mockTenant as any));

    await waitFor(() => expect(result.current.loading).toBe(false));

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plugins: [{ plugin_name: "new-plugin", assets: [], config: {}, manifest: {} }],
      }),
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.plugins.length).toBe(1);
      expect(result.current.plugins[0].plugin_name).toBe("new-plugin");
    });
  });
});
