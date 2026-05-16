/**
 * Test-Dock Plugin Bootstrap
 * ──────────────────────────
 * Registers the test-dock plugin's React components into the slot system.
 *
 * In a real plugin shipping pipeline, this file would be bundled as a
 * separate async chunk and loaded on demand. Here it's loaded eagerly as
 * a demonstration of the slot injection pattern.
 *
 * Usage: Import and call bootstrapTestDock() after the PluginSlotProvider
 * has mounted, or use the usePluginSlot hook inside a component.
 */

import React from "react";
import { usePluginSlot } from "@/components/PluginSlot";
import { Slots } from "@/lib/pluginRegistry";

const TestDockWidget = React.lazy(() =>
  import("@/components/plugin/TestDockWidget").then((m) => ({ default: m.TestDockWidget }))
);

/**
 * Mount this component anywhere inside <PluginSlotProvider> to register
 * the test-dock widget into the dashboard.widgets slot.
 *
 * @example
 * // In App.tsx or a layout component:
 * <TestDockPluginBootstrap />
 */
export function TestDockPluginBootstrap() {
  usePluginSlot(Slots.DASHBOARD_WIDGETS, TestDockWidget, "test-dock");
  return null;
}
