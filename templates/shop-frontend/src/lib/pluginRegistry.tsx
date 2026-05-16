/**
 * Plugin UI Registry
 * ──────────────────
 * Fetches the server-side UI registry and exposes it via React context.
 * The registry tells the front-end which plugins have registered menu items,
 * dashboard widgets, settings pages, and slot components.
 *
 * UI_VERSION is checked against the server's uiVersion (semver ^1.x).
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

// ─── Versioning ───────────────────────────────────────────────────────────────

/** Increment minor when adding new slots/components; increment major on breaking changes. */
export const UI_VERSION = "1.0.0";

// ─── Slot catalogue ───────────────────────────────────────────────────────────

/**
 * Every named injection point in the app.
 * Plugins may only register into these named slots.
 */
export const Slots = {
  // Admin Dashboard
  NAV_MAIN: "nav.main",
  DASHBOARD_TOP: "dashboard.top",
  DASHBOARD_MIDDLE: "dashboard.middle",
  DASHBOARD_BOTTOM: "dashboard.bottom",
  DASHBOARD_WIDGETS: "dashboard.widgets",
  ADMIN_SETTINGS_TABS: "admin.settings.tabs",
  POS_ACTIONS: "pos.actions",
  HOUSEKEEPING_ROOM_CARD: "housekeeping.room_card",
  RESERVATION_DETAIL: "reservation.detail",

  // Guest Portal
  GUEST_DASHBOARD_CARDS: "guest.dashboard.cards",
  GUEST_BOOKING_DETAIL: "guest.booking.detail",
  GUEST_PROFILE_SECTIONS: "guest.profile.sections",

  // Staff Dashboard
  STAFF_ROSTER_SHIFTS: "staff.roster.shifts",
  STAFF_TASKS_LIST: "staff.tasks.list",

  // Public pages
  PUBLIC_PROPERTY_HERO: "public.property_detail.hero",
  PUBLIC_PROPERTY_AMENITIES: "public.property_detail.amenities",
  PUBLIC_BOOKING_UPSELLS: "public.booking.upsells",
  PUBLIC_FOOTER_LINKS: "public.footer.links",
} as const;

export type SlotName = (typeof Slots)[keyof typeof Slots];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  order?: number;
  pluginId?: string;
}

export interface PluginDashboardWidget {
  id: string;
  position: "main-top" | "main-bottom" | "sidebar";
  pluginId?: string;
}

export interface PluginSettingsPage {
  id: string;
  label: string;
  path: string;
  icon?: string;
  pluginId?: string;
}

export interface PluginAdminPage {
  title: string;
  path: string;
  table: string;
  columns: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  pluginId?: string;
}

export interface UIRegistry {
  uiVersion: string;
  slots: Record<string, string[]>;
  menuItems: PluginMenuItem[];
  dashboardWidgets: PluginDashboardWidget[];
  settingsPages: PluginSettingsPage[];
  adminPages: PluginAdminPage[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface PluginRegistryContextValue {
  registry: UIRegistry | null;
  isLoading: boolean;
  versionMismatch: boolean;
  refetch: () => void;
}

const PluginRegistryContext = createContext<PluginRegistryContextValue>({
  registry: null,
  isLoading: true,
  versionMismatch: false,
  refetch: () => {},
});

// ─── Semver compat check (^major.minor) ──────────────────────────────────────

function isCompatible(serverVersion: string, clientVersion: string): boolean {
  try {
    const [sMaj] = serverVersion.split(".").map(Number);
    const [cMaj] = clientVersion.split(".").map(Number);
    return sMaj === cMaj;
  } catch {
    return false;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PluginRegistryProvider({ children }: { children: React.ReactNode }) {
  const [registry, setRegistry] = useState<UIRegistry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [versionMismatch, setVersionMismatch] = useState(false);

  const fetchRegistry = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<UIRegistry>("/plugins/ui-registry");
      const data = res.data;

      if (data.uiVersion && !isCompatible(data.uiVersion, UI_VERSION)) {
        console.warn(
          `[PluginRegistry] UI version mismatch: server=${data.uiVersion}, client=${UI_VERSION}. ` +
            "Plugin UI components may not render correctly."
        );
        setVersionMismatch(true);
      }

      setRegistry(data);
    } catch (err) {
      console.error("[PluginRegistry] Failed to fetch ui-registry:", err);
      setRegistry({
        uiVersion: UI_VERSION,
        slots: {},
        menuItems: [],
        dashboardWidgets: [],
        settingsPages: [],
        adminPages: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  return (
    <PluginRegistryContext.Provider
      value={{ registry, isLoading, versionMismatch, refetch: fetchRegistry }}
    >
      {children}
    </PluginRegistryContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePluginRegistry() {
  return useContext(PluginRegistryContext);
}

export function usePluginMenuItems(): PluginMenuItem[] {
  const { registry } = usePluginRegistry();
  return registry?.menuItems ?? [];
}

export function usePluginAdminPages(): PluginAdminPage[] {
  const { registry } = usePluginRegistry();
  return registry?.adminPages ?? [];
}

export function usePluginSettingsTabs(): PluginSettingsPage[] {
  const { registry } = usePluginRegistry();
  return registry?.settingsPages ?? [];
}

export function usePluginDashboardWidgets(): PluginDashboardWidget[] {
  const { registry } = usePluginRegistry();
  return registry?.dashboardWidgets ?? [];
}
