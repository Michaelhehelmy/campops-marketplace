/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/lib/pluginRegistry.tsx
 * Tests: PluginRegistryProvider, usePluginRegistry, usePluginMenuItems,
 *        usePluginAdminPages, UI_VERSION, Slots catalogue, version mismatch flag.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() },
}));

import { api } from "@/lib/api";
import {
  PluginRegistryProvider,
  usePluginRegistry,
  usePluginMenuItems,
  usePluginAdminPages,
  usePluginSettingsTabs,
  usePluginDashboardWidgets,
  UI_VERSION,
  Slots,
  type UIRegistry,
} from "../pluginRegistry";

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrap(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={makeQC()}>
      <PluginRegistryProvider>{ui}</PluginRegistryProvider>
    </QueryClientProvider>
  );
}

const MOCK_REGISTRY: UIRegistry = {
  uiVersion: UI_VERSION,
  slots: { "nav.main": ["plugin-a:Nav"] },
  menuItems: [{ id: "m1", label: "Reports", path: "/reports", pluginId: "plugin-a" }],
  dashboardWidgets: [],
  settingsPages: [],
  adminPages: [
    {
      title: "Dummy Table",
      path: "/admin/dummy",
      table: "plugin_test_dummy",
      columns: ["name"],
      pluginId: "plugin-a",
    },
  ],
};

function mockFetch(data = MOCK_REGISTRY) {
  (api.get as any).mockResolvedValue({ data });
}

function mockFetchError() {
  (api.get as any).mockRejectedValue(new Error("Network error"));
}

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────

describe("UI_VERSION", () => {
  it("is a valid semver string", () => {
    expect(UI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("Slots catalogue", () => {
  it("contains expected slot names", () => {
    expect(Slots.DASHBOARD_WIDGETS).toBe("dashboard.widgets");
    expect(Slots.NAV_MAIN).toBe("nav.main");
    expect(Slots.POS_ACTIONS).toBe("pos.actions");
    expect(Slots.GUEST_DASHBOARD_CARDS).toBe("guest.dashboard.cards");
  });
});

describe("PluginRegistryProvider – successful fetch", () => {
  it("exposes the fetched registry to consumers", async () => {
    mockFetch();
    const Consumer = () => {
      const { registry, isLoading } = usePluginRegistry();
      if (isLoading) return <span>loading</span>;
      return <span data-testid="version">{registry?.uiVersion}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });

    await waitFor(() => expect(screen.getByTestId("version")).toBeInTheDocument());
    expect(screen.getByTestId("version")).toHaveTextContent(UI_VERSION);
  });

  it("starts in loading state", async () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // never resolves
    const Consumer = () => {
      const { isLoading } = usePluginRegistry();
      return <span data-testid="state">{isLoading ? "loading" : "done"}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    expect(screen.getByTestId("state")).toHaveTextContent("loading");
  });
});

describe("PluginRegistryProvider – version mismatch", () => {
  it("sets versionMismatch=true when server major version differs from client", async () => {
    mockFetch({ ...MOCK_REGISTRY, uiVersion: "9.0.0" }); // major mismatch
    const Consumer = () => {
      const { versionMismatch, isLoading } = usePluginRegistry();
      if (isLoading) return null;
      return <span data-testid="mismatch">{String(versionMismatch)}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByTestId("mismatch")).toHaveTextContent("true"));
  });

  it("does NOT set versionMismatch when versions share the same major", async () => {
    mockFetch({ ...MOCK_REGISTRY, uiVersion: "1.99.0" }); // same major 1
    const Consumer = () => {
      const { versionMismatch, isLoading } = usePluginRegistry();
      if (isLoading) return null;
      return <span data-testid="mismatch">{String(versionMismatch)}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByTestId("mismatch")).toHaveTextContent("false"));
  });
});

describe("PluginRegistryProvider – fetch failure", () => {
  it("falls back to an empty registry and stops loading on error", async () => {
    mockFetchError();
    const Consumer = () => {
      const { registry, isLoading } = usePluginRegistry();
      if (isLoading) return <span>loading</span>;
      return (
        <>
          <span data-testid="items">{registry?.menuItems.length ?? "null"}</span>
        </>
      );
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByTestId("items")).toBeInTheDocument());
    expect(screen.getByTestId("items")).toHaveTextContent("0");
  });
});

describe("usePluginMenuItems", () => {
  it("returns menu items from the fetched registry", async () => {
    mockFetch();
    const Consumer = () => {
      const items = usePluginMenuItems();
      return (
        <ul>
          {items.map((i) => (
            <li key={i.id}>{i.label}</li>
          ))}
        </ul>
      );
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByText("Reports")).toBeInTheDocument());
  });

  it("returns empty array before the registry loads", async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    const Consumer = () => {
      const items = usePluginMenuItems();
      return <span data-testid="count">{items.length}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

describe("usePluginAdminPages", () => {
  it("returns admin pages from the fetched registry", async () => {
    mockFetch();
    const Consumer = () => {
      const pages = usePluginAdminPages();
      return (
        <ul>
          {pages.map((p) => (
            <li key={p.path}>{p.title}</li>
          ))}
        </ul>
      );
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByText("Dummy Table")).toBeInTheDocument());
  });
});

describe("usePluginSettingsTabs", () => {
  it("returns empty array when registry has no settings pages", async () => {
    mockFetch({ ...MOCK_REGISTRY, settingsPages: [] });
    const { usePluginSettingsTabs } = await import("../pluginRegistry");
    const Consumer = () => {
      const tabs = usePluginSettingsTabs();
      return <span data-testid="count">{tabs.length}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });

  it("returns settings pages injected by plugins", async () => {
    const regWithSettings = {
      ...MOCK_REGISTRY,
      settingsPages: [
        { id: "pwa-settings", label: "PWA Settings", path: "/admin/settings/pwa", pluginId: "pwa" },
      ],
    };
    mockFetch(regWithSettings);
    const { usePluginSettingsTabs } = await import("../pluginRegistry");
    const Consumer = () => {
      const tabs = usePluginSettingsTabs();
      return (
        <ul>
          {tabs.map((t) => (
            <li key={t.id}>{t.label}</li>
          ))}
        </ul>
      );
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByText("PWA Settings")).toBeInTheDocument());
  });
});

describe("usePluginDashboardWidgets", () => {
  it("returns dashboard widgets from the registry", async () => {
    const regWithWidgets = {
      ...MOCK_REGISTRY,
      dashboardWidgets: [
        { id: "loyalty-widget", position: "sidebar" as const, pluginId: "loyalty" },
      ],
    };
    mockFetch(regWithWidgets);
    const { usePluginDashboardWidgets } = await import("../pluginRegistry");
    const Consumer = () => {
      const widgets = usePluginDashboardWidgets();
      return <span data-testid="widget-count">{widgets.length}</span>;
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByTestId("widget-count")).toHaveTextContent("1"));
  });
});

describe("PluginRegistryProvider – refetch", () => {
  it("re-fetches registry when refetch() is called", async () => {
    mockFetch();
    const Consumer = () => {
      const { registry, isLoading, refetch } = usePluginRegistry();
      if (isLoading) return <span>loading</span>;
      return (
        <button data-testid="refetch" onClick={refetch}>
          {registry?.menuItems.length ?? 0}
        </button>
      );
    };
    await act(async () => {
      wrap(<Consumer />);
    });
    await waitFor(() => expect(screen.getByTestId("refetch")).toBeInTheDocument());

    // Simulate refetch with updated data
    (api.get as any).mockResolvedValue({
      data: {
        ...MOCK_REGISTRY,
        menuItems: [
          { id: "m1", label: "Reports", path: "/reports", pluginId: "plugin-a" },
          { id: "m2", label: "Analytics", path: "/analytics", pluginId: "plugin-b" },
        ],
      },
    });

    await act(async () => {
      screen.getByTestId("refetch").click();
    });

    await waitFor(() => expect(screen.getByTestId("refetch")).toHaveTextContent("2"));
  });
});
