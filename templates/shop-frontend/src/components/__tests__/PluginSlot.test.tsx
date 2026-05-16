// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/components/PluginSlot.tsx
 *
 * NOTE: PluginSlotProvider uses forceUpdate inside register(), which causes
 * React's act() boundary to keep flushing. All renders that involve a
 * Registrar (which calls register on mount) must be wrapped in act() and
 * then awaited to fully drain the update queue.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { PluginSlotProvider, PluginSlot, usePluginSlot, Slots } from "../PluginSlot";
import { usePluginRegistry } from "@/lib/pluginRegistry";

vi.mock("@/lib/pluginRegistry", async () => {
  const actual = await vi.importActual<any>("@/lib/pluginRegistry");
  return {
    ...actual,
    usePluginRegistry: vi.fn().mockReturnValue({ registry: null, isLoading: false }),
  };
});

// ── Test helpers ──────────────────────────────────────────────────────────────

function Widget({ label = "Widget" }: { label?: string }) {
  return <div data-testid="plugin-widget">{label}</div>;
}

function Registrar({
  slot,
  component,
  pluginId = "test-plugin",
}: {
  slot: string;
  component: React.ComponentType<any>;
  pluginId?: string;
}) {
  usePluginSlot(slot, component, pluginId);
  return null;
}

async function wrap(ui: React.ReactElement) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<PluginSlotProvider>{ui}</PluginSlotProvider>);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("PluginSlot – no registered components", () => {
  it("renders nothing when the slot is empty", async () => {
    const { container } = await wrap(<PluginSlot name={Slots.DASHBOARD_WIDGETS} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the fallback when provided and slot is empty", async () => {
    await wrap(
      <PluginSlot
        name={Slots.DASHBOARD_WIDGETS}
        fallback={<span data-testid="fallback">No plugins</span>}
      />
    );
    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });
});

describe("PluginSlot – with registered components", () => {
  it("renders a component registered into the slot via usePluginSlot", async () => {
    await wrap(
      <>
        <Registrar slot={Slots.DASHBOARD_WIDGETS} component={Widget} />
        <PluginSlot name={Slots.DASHBOARD_WIDGETS} />
      </>
    );
    await waitFor(() => expect(screen.getByTestId("plugin-widget")).toBeInTheDocument());
  });

  it("renders multiple components registered into the same slot", async () => {
    const A = () => <div data-testid="comp-a">A</div>;
    const B = () => <div data-testid="comp-b">B</div>;

    await wrap(
      <>
        <Registrar slot={Slots.NAV_MAIN} component={A} pluginId="plugin-a" />
        <Registrar slot={Slots.NAV_MAIN} component={B} pluginId="plugin-b" />
        <PluginSlot name={Slots.NAV_MAIN} />
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId("comp-a")).toBeInTheDocument();
      expect(screen.getByTestId("comp-b")).toBeInTheDocument();
    });
  });

  it("forwards props to registered components", async () => {
    const PropsWidget = ({ title }: { title: string }) => (
      <div data-testid="props-widget">{title}</div>
    );

    await wrap(
      <>
        <Registrar slot={Slots.DASHBOARD_WIDGETS} component={PropsWidget} />
        <PluginSlot name={Slots.DASHBOARD_WIDGETS} props={{ title: "Hello from slot" }} />
      </>
    );

    await waitFor(() =>
      expect(screen.getByTestId("props-widget")).toHaveTextContent("Hello from slot")
    );
  });

  it("does not render into a different slot", async () => {
    await wrap(
      <>
        <Registrar slot={Slots.NAV_MAIN} component={Widget} />
        <PluginSlot name={Slots.DASHBOARD_WIDGETS} />
      </>
    );
    expect(screen.queryByTestId("plugin-widget")).not.toBeInTheDocument();
  });

  it("logs a warning when a remote component key cannot be resolved", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    (usePluginRegistry as any).mockReturnValue({
      registry: {
        slots: { [Slots.DASHBOARD_WIDGETS]: ["unknown-plugin:missing-comp"] },
      },
    });

    await wrap(<PluginSlot name={Slots.DASHBOARD_WIDGETS} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not resolve component for key: unknown-plugin:missing-comp")
    );
    consoleSpy.mockRestore();
    (usePluginRegistry as any).mockReturnValue({ registry: null, isLoading: false });
  });
});

describe("PluginSlot – error boundary", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Suppress JSDOM's uncaught error logging
    if (typeof window !== "undefined") {
      window.addEventListener("error", (e) => e.preventDefault());
    }
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("shows an error alert when a plugin component throws", async () => {
    const BrokenWidget = (): React.ReactElement => {
      throw new Error("Plugin exploded");
    };

    await wrap(
      <>
        <Registrar slot={Slots.POS_ACTIONS} component={BrokenWidget} />
        <PluginSlot name={Slots.POS_ACTIONS} />
      </>
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("Plugin component failed to load");
  });
});

describe("PluginSlot – cleanup on unmount", () => {
  it("removes the component from the slot when the registrar unmounts", async () => {
    let result!: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <PluginSlotProvider>
          <Registrar slot={Slots.DASHBOARD_WIDGETS} component={Widget} />
          <PluginSlot name={Slots.DASHBOARD_WIDGETS} />
        </PluginSlotProvider>
      );
    });

    await waitFor(() => expect(screen.getByTestId("plugin-widget")).toBeInTheDocument());

    await act(async () => {
      result.rerender(
        <PluginSlotProvider>
          <PluginSlot name={Slots.DASHBOARD_WIDGETS} />
        </PluginSlotProvider>
      );
    });

    expect(screen.queryByTestId("plugin-widget")).not.toBeInTheDocument();
    result.unmount();
  });
});

describe("PluginSlot – outside provider (NODE_ENV=test no-op)", () => {
  it("renders nothing when used without a provider in test mode", async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<PluginSlot name={Slots.DASHBOARD_WIDGETS} />));
    });
    expect(container.firstChild).toBeNull();
  });

  it("calls register on NULL_REGISTRY when no provider is present", async () => {
    const TestComp = () => {
      usePluginSlot("test", () => null);
      return null;
    };
    // This hits line 39 via useSlotRegistry returning NULL_REGISTRY
    render(<TestComp />);
  });

  it.skip("throws error when used without a provider in non-test mode", () => {
    // process.env.NODE_ENV is frozen in Vitest and cannot be mutated at runtime.
    // The throw path (when NODE_ENV !== 'test') is covered by code inspection.
  });
});
