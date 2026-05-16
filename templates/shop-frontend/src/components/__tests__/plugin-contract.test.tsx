// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  PluginRegistryProvider,
  usePluginMenuItems,
  usePluginAdminPages,
  usePluginSettingsTabs,
  usePluginDashboardWidgets,
} from "@/lib/pluginRegistry";
import { PluginSlotProvider, PluginSlot } from "../PluginSlot";
import { componentRegistry } from "@/lib/ComponentRegistry";
import { api } from "@/lib/api";

// Mock the API
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("Plugin Contract - Declarative Registration", () => {
  const MockWidget = () => <div data-testid="remote-widget">Remote Widget</div>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Register the component in the global registry
    componentRegistry.register("test:MockWidget", MockWidget);
  });

  it("renders a component from the backend registry", async () => {
    // Mock the backend registry response
    (api.get as any).mockResolvedValue({
      data: {
        uiVersion: "1.0.0",
        slots: {
          "dashboard.top": ["test:MockWidget"],
        },
        menuItems: [],
        dashboardWidgets: [],
        settingsPages: [],
        adminPages: [],
      },
    });

    render(
      <PluginRegistryProvider>
        <PluginSlotProvider>
          <PluginSlot name="dashboard.top" />
        </PluginSlotProvider>
      </PluginRegistryProvider>
    );

    // Should wait for API and then render
    await waitFor(() => {
      expect(screen.getByTestId("remote-widget")).toBeInTheDocument();
    });
  });

  it("renders both local and remote components in the same slot", async () => {
    const LocalWidget = () => <div data-testid="local-widget">Local Widget</div>;

    (api.get as any).mockResolvedValue({
      data: {
        uiVersion: "1.0.0",
        slots: {
          "dashboard.top": ["test:MockWidget"],
        },
        menuItems: [],
        dashboardWidgets: [],
        settingsPages: [],
        adminPages: [],
      },
    });

    const { usePluginSlot } = await import("../PluginSlot");
    const Registrar = () => {
      usePluginSlot("dashboard.top", LocalWidget, "local-plugin");
      return null;
    };

    render(
      <PluginRegistryProvider>
        <PluginSlotProvider>
          <Registrar />
          <PluginSlot name="dashboard.top" />
        </PluginSlotProvider>
      </PluginRegistryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("remote-widget")).toBeInTheDocument();
      expect(screen.getByTestId("local-widget")).toBeInTheDocument();
    });
  });

  it("handles missing components gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    (api.get as any).mockResolvedValue({
      data: {
        uiVersion: "1.0.0",
        slots: {
          "dashboard.top": ["nonexistent:Widget"],
        },
        menuItems: [],
        dashboardWidgets: [],
        settingsPages: [],
        adminPages: [],
      },
    });

    render(
      <PluginRegistryProvider>
        <PluginSlotProvider>
          <PluginSlot name="dashboard.top" fallback={<div data-testid="fallback">Fallback</div>} />
        </PluginSlotProvider>
      </PluginRegistryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("fallback")).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not resolve component for key: nonexistent:Widget")
    );
    consoleSpy.mockRestore();
  });

  it("handles version mismatch", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    (api.get as any).mockResolvedValue({
      data: {
        uiVersion: "2.0.0", // Different major version
        slots: {},
        menuItems: [],
        dashboardWidgets: [],
        settingsPages: [],
        adminPages: [],
      },
    });

    render(
      <PluginRegistryProvider>
        <div />
      </PluginRegistryProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("UI version mismatch"));
    });
    consoleSpy.mockRestore();
  });

  it("handles invalid version string gracefully", async () => {
    (api.get as any).mockResolvedValue({
      data: {
        uiVersion: "invalid",
        slots: {},
        menuItems: [],
        dashboardWidgets: [],
        settingsPages: [],
        adminPages: [],
      },
    });

    render(
      <PluginRegistryProvider>
        <div />
      </PluginRegistryProvider>
    );

    // Should not crash, just continue
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("handles API failure by returning empty registry", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (api.get as any).mockRejectedValue(new Error("Network Error"));

    render(
      <PluginRegistryProvider>
        <PluginSlot name="dashboard.top" fallback={<div data-testid="fallback">Empty</div>} />
      </PluginRegistryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("fallback")).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("provides hooks for menu items, admin pages, and settings", async () => {
    const mockRegistry = {
      uiVersion: "1.0.0",
      slots: {},
      menuItems: [{ id: "m1", label: "Menu 1", path: "/m1" }],
      dashboardWidgets: [{ id: "w1", position: "main-top" }],
      settingsPages: [{ id: "s1", label: "Set 1", path: "/s1" }],
      adminPages: [{ title: "Admin 1", path: "/a1", table: "t1", columns: ["c1"] }],
    };

    (api.get as any).mockResolvedValue({ data: mockRegistry });

    const HookTester = () => {
      const menuItems = usePluginMenuItems();
      const adminPages = usePluginAdminPages();
      const settingsTabs = usePluginSettingsTabs();
      const widgets = usePluginDashboardWidgets();

      return (
        <div>
          <div data-testid="menu-count">{menuItems.length}</div>
          <div data-testid="admin-count">{adminPages.length}</div>
          <div data-testid="settings-count">{settingsTabs.length}</div>
          <div data-testid="widget-count">{widgets.length}</div>
        </div>
      );
    };

    render(
      <PluginRegistryProvider>
        <HookTester />
      </PluginRegistryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("menu-count")).toHaveTextContent("1");
      expect(screen.getByTestId("admin-count")).toHaveTextContent("1");
      expect(screen.getByTestId("settings-count")).toHaveTextContent("1");
      expect(screen.getByTestId("widget-count")).toHaveTextContent("1");
    });
  });
});

describe("ComponentRegistry", () => {
  it("warns when overwriting a component", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Comp1 = () => null;
    const Comp2 = () => null;

    componentRegistry.register("test:overwrite", Comp1);
    componentRegistry.register("test:overwrite", Comp2);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Overwriting component for key: test:overwrite")
    );
    expect(componentRegistry.resolve("test:overwrite")).toBe(Comp2);
    consoleSpy.mockRestore();
  });

  it("returns all registered keys", () => {
    componentRegistry.register("key:1", () => null);
    componentRegistry.register("key:2", () => null);
    expect(componentRegistry.getKeys()).toContain("key:1");
    expect(componentRegistry.getKeys()).toContain("key:2");
  });
});
