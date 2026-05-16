/**
 * Manager Routes — /manage/:listingId/*
 *
 * Accessible by:
 *   - marketplace_master (unrestricted)
 *   - listing_admin / admin / manager / staff (only for listings in their listing_ids)
 *
 * Implements SSO: the same credentials used on the listing's own domain
 * grant access here. The backend JWT includes listing_ids which are checked
 * by RequireListingAccess via canManageListing().
 */

import { lazy } from "react";
import { Route, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireListingAccess } from "./guards";

// Manager-specific pages
const ListingOverviewPage = lazy(() => import("@/pages/manager/ListingOverviewPage"));
const MaintenancePage = lazy(() => import("@/pages/manager/MaintenancePage"));

// Reused admin/staff pages (already exist in codebase)
const RoomManagerPage = lazy(() => import("@/pages/admin/RoomManagerPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const OrderManagementPage = lazy(() => import("@/pages/staff/OrderManagementPage"));
const HousekeepingPage = lazy(() => import("@/pages/staff/HousekeepingPage"));
const RosterPage = lazy(() => import("@/pages/staff/RosterPage"));
const AdminFinancesPage = lazy(() => import("@/pages/admin/AdminFinancesPage"));
const PluginsPage = lazy(() => import("@/pages/admin/PluginsPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));

// Reservations management
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));

/**
 * Wrapper that extracts :listingId from the URL and applies the SSO guard.
 */
function ListingAccessWrapper({ children }: { children: React.ReactNode }) {
  const { listingId } = useParams<{ listingId: string }>();
  return <RequireListingAccess listingId={listingId!}>{children}</RequireListingAccess>;
}

export function ManagerRoutes() {
  return (
    <Route
      path="/manage/:listingId"
      element={
        <ListingAccessWrapper>
          <AppLayout />
        </ListingAccessWrapper>
      }
    >
      {/* ── Listing overview ──────────────────────────────── */}
      <Route index element={<ListingOverviewPage />} />

      {/* ── Bookings ─────────────────────────────────────── */}
      <Route path="bookings" element={<DashboardPage />} />

      {/* ── Rooms ────────────────────────────────────────── */}
      <Route path="rooms" element={<RoomManagerPage />} />

      {/* ── Guests (CRM) ─────────────────────────────────── */}
      <Route path="guests" element={<UserManagementPage />} />

      {/* ── POS Orders ───────────────────────────────────── */}
      <Route path="orders" element={<OrderManagementPage />} />

      {/* ── Housekeeping ─────────────────────────────────── */}
      <Route path="housekeeping" element={<HousekeepingPage />} />

      {/* ── Maintenance ──────────────────────────────────── */}
      <Route path="maintenance" element={<MaintenancePage />} />

      {/* ── Staff & Roster ───────────────────────────────── */}
      <Route path="staff" element={<RosterPage />} />

      {/* ── Finance ──────────────────────────────────────── */}
      <Route path="finance" element={<AdminFinancesPage />} />

      {/* ── Plugin management (if delegated by master) ───── */}
      <Route path="plugins" element={<PluginsPage />} />

      {/* ── Listing settings ─────────────────────────────── */}
      <Route path="settings" element={<SettingsPage />} />
    </Route>
  );
}
