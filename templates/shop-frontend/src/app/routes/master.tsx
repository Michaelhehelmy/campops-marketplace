/**
 * Master Routes — /master/*
 *
 * Accessible only by users with role === 'marketplace_master'.
 * Provides global platform management: listings, plugins, commissions,
 * feature configuration, admins, and audit logs.
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireRole } from "./guards";

// Master-specific pages
const MasterDashboardPage = lazy(() => import("@/pages/master/MasterDashboardPage"));
const AllListingsPage = lazy(() => import("@/pages/master/AllListingsPage"));
const ListingDeepDivePage = lazy(() => import("@/pages/master/ListingDeepDivePage"));
const FeatureConfigPage = lazy(() => import("@/pages/master/FeatureConfigPage"));
const CommissionsPage = lazy(() => import("@/pages/master/CommissionsPage"));

// Reused pages from admin context
const PluginsPage = lazy(() => import("@/pages/admin/PluginsPage"));
const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const AuditLogsPage = lazy(() => import("@/pages/admin/AuditLogsPage"));
const AdminFinancesPage = lazy(() => import("@/pages/admin/AdminFinancesPage"));

export function MasterRoutes() {
  return (
    <Route
      path="/master"
      element={
        <RequireRole
          roles={["marketplace_master"]}
          message="This area is restricted to Marketplace Masters."
        >
          <AppLayout />
        </RequireRole>
      }
    >
      {/* ── Master dashboard ─────────────────────────────── */}
      <Route index element={<MasterDashboardPage />} />

      {/* ── All listings ─────────────────────────────────── */}
      <Route path="listings" element={<AllListingsPage />} />
      <Route path="listings/:id" element={<ListingDeepDivePage />} />

      {/* ── Plugin catalog ───────────────────────────────── */}
      <Route path="plugins" element={<PluginsPage />} />

      {/* ── Feature configuration ────────────────────────── */}
      <Route path="feature-config" element={<FeatureConfigPage />} />

      {/* ── Admin accounts ───────────────────────────────── */}
      <Route path="admins" element={<UserManagementPage />} />

      {/* ── Commission report ────────────────────────────── */}
      <Route path="commissions" element={<CommissionsPage />} />

      {/* ── Global settings ──────────────────────────────── */}
      <Route path="settings" element={<SettingsPage />} />

      {/* ── Audit logs ───────────────────────────────────── */}
      <Route path="logs" element={<AuditLogsPage />} />

      {/* ── Accounting (plugin-gated) ────────────────────── */}
      <Route path="accounting" element={<AdminFinancesPage />} />

      {/* ── Global CRM (plugin-gated) ────────────────────── */}
      <Route path="crm" element={<UserManagementPage />} />
    </Route>
  );
}
