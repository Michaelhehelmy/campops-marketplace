import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePluginAdminPages } from "@/lib/pluginRegistry";
import { PluginCrudPage } from "@/components/plugin/PluginCrudPage";
import { TestDockPluginBootstrap } from "@/plugin-bootstrap/test-dock";
import { useTenant } from "@/hooks/useTenant";
import { usePlugins } from "@/hooks/usePlugins";
import { bootstrapPWA } from "@/plugin-bootstrap/pwa";
import { bootstrapLoyalty } from "@/plugin-bootstrap/loyalty";
import { bootstrapICal } from "@/plugin-bootstrap/ical";
import { bootstrapSiteMinder } from "@/plugin-bootstrap/siteminder";
import { RequireRole, PageLoading } from "@/app/routes/guards";

// Route group modules
import { PublicRoutes } from "@/app/routes/public";
import { GuestRoutes } from "@/app/routes/guest";
import { ManagerRoutes } from "@/app/routes/manager";
import { MasterRoutes } from "@/app/routes/master";

// Initialize built-in plugins
bootstrapPWA();
bootstrapLoyalty();
bootstrapICal();
bootstrapSiteMinder();

// Misc pages
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// ── Admin pages (legacy /admin/* paths) ───────────────────────────────
const HousekeepingPage = lazy(() => import("@/pages/staff/HousekeepingPage"));
const OrderManagementPage = lazy(() => import("@/pages/staff/OrderManagementPage"));
const StaffFinancesPage = lazy(() => import("@/pages/staff/StaffFinancesPage"));
const InventoryViewerPage = lazy(() => import("@/pages/staff/InventoryViewerPage"));
const RosterPage = lazy(() => import("@/pages/staff/RosterPage"));
const StaffProfilePage = lazy(() => import("@/pages/staff/StaffProfilePage"));

const UserManagementPage = lazy(() => import("@/pages/admin/UserManagementPage"));
const RolesPage = lazy(() => import("@/pages/admin/RolesPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const SystemAdminPage = lazy(() => import("@/pages/admin/SystemAdminPage"));
const AuditLogsPage = lazy(() => import("@/pages/admin/AuditLogsPage"));
const PluginsPage = lazy(() => import("@/pages/admin/PluginsPage"));
const BugReportsPage = lazy(() => import("@/pages/admin/BugReportsPage"));
const ReportsPage = lazy(() => import("@/pages/admin/ReportsPage"));
const RoomManagerPage = lazy(() => import("@/pages/admin/RoomManagerPage"));
const RatePlansPage = lazy(() => import("@/pages/admin/RatePlansPage"));
const InventoryManagerPage = lazy(() => import("@/pages/admin/InventoryManagerPage"));
const MediaGalleryPage = lazy(() => import("@/pages/admin/MediaGalleryPage"));
const BlogEditorPage = lazy(() => import("@/pages/admin/BlogEditorPage"));
const IntegrationsPage = lazy(() => import("@/pages/admin/IntegrationsPage"));
const POSManagementPage = lazy(() => import("@/pages/admin/POSManagementPage"));
const AdminBillingPage = lazy(() => import("@/pages/admin/AdminBillingPage"));
const AdminFinancesPage = lazy(() => import("@/pages/admin/AdminFinancesPage"));
const FeedbackAdminPage = lazy(() => import("@/pages/admin/FeedbackAdminPage"));
const LoyaltySettingsPage = lazy(() => import("@/pages/admin/LoyaltySettingsPage"));
const NavigationPage = lazy(() => import("@/pages/admin/NavigationPage"));
const ProcurementPage = lazy(() => import("@/pages/admin/ProcurementPage"));
const SuppliersPage = lazy(() => import("@/pages/admin/SuppliersPage"));
const RecipesPage = lazy(() => import("@/pages/admin/RecipesPage"));
const WastePage = lazy(() => import("@/pages/admin/WastePage"));
const TransportationPage = lazy(() => import("@/pages/admin/TransportationPage"));
const ActivitiesAdminPage = lazy(() => import("@/pages/admin/ActivitiesAdminPage"));
const WebhookLogsPage = lazy(() => import("@/pages/admin/WebhookLogsPage"));

const ADMIN_ROLES = ["admin", "listing_admin", "marketplace_master"] as const;
const STAFF_ROLES = ["staff", "admin", "listing_admin", "marketplace_master"] as const;

export default function App() {
  const { user } = useAuth();
  const pluginAdminPages = usePluginAdminPages();
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  const { plugins, loading: pluginsLoading, error: pluginsError } = usePlugins(tenant);

  useEffect(() => {
    if (tenant) {
      console.log("[App] Tenant resolved:", tenant.name, `(${tenant.slug})`);
      document.title = tenant.name;
    }
    if (tenantError) {
      console.warn("[App] Tenant resolution failed:", tenantError);
    }
  }, [tenant, tenantError]);

  useEffect(() => {
    if (plugins.length > 0) {
      console.log("[App] Active plugins loaded:", plugins.map((p) => p.plugin_name).join(", "));
    }
    if (pluginsError) {
      console.warn("[App] Plugin loading failed:", pluginsError);
    }
  }, [plugins, pluginsError]);

  return (
    <>
      <TestDockPluginBootstrap />
      <OfflineBanner />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* ══ 1. Public routes (no auth) ════════════════════════════════════ */}
          {PublicRoutes()}

          {/* ══ 2. Guest portal routes (/dashboard/*) ════════════════════════ */}
          {GuestRoutes()}

          {/* ══ 3. Manager routes (/manage/:listingId/*) — SSO gated ═════════ */}
          {ManagerRoutes()}

          {/* ══ 4. Master routes (/master/*) — marketplace_master only ═══════ */}
          {MasterRoutes()}

          {/* ══ 5. Legacy /admin/* routes (backward compat) ══════════════════ */}
          <Route
            element={
              <RequireRole roles={[...ADMIN_ROLES]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/roles" element={<RolesPage />} />
            <Route path="/admin/plugins" element={<PluginsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/system" element={<SystemAdminPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/bug-reports" element={<BugReportsPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/rooms" element={<RoomManagerPage />} />
            <Route path="/admin/rate-plans" element={<RatePlansPage />} />
            <Route path="/admin/inventory" element={<InventoryManagerPage />} />
            <Route path="/admin/media" element={<MediaGalleryPage />} />
            <Route path="/admin/blog" element={<BlogEditorPage />} />
            <Route path="/admin/integrations" element={<IntegrationsPage />} />
            <Route path="/admin/pos" element={<POSManagementPage />} />
            <Route path="/admin/billing" element={<AdminBillingPage />} />
            <Route path="/admin/finances" element={<AdminFinancesPage />} />
            <Route path="/admin/feedback" element={<FeedbackAdminPage />} />
            <Route path="/admin/loyalty" element={<LoyaltySettingsPage />} />
            <Route path="/admin/navigation" element={<NavigationPage />} />
            <Route path="/admin/procurement" element={<ProcurementPage />} />
            <Route path="/admin/suppliers" element={<SuppliersPage />} />
            <Route path="/admin/recipes" element={<RecipesPage />} />
            <Route path="/admin/waste" element={<WastePage />} />
            <Route path="/admin/transportation" element={<TransportationPage />} />
            <Route path="/admin/activities" element={<ActivitiesAdminPage />} />
            <Route path="/admin/webhooks" element={<WebhookLogsPage />} />

            {/* Dynamic Plugin Admin CRUD Routes */}
            {pluginAdminPages.map((page) => {
              const [, pluginName, tableSuffix] = page.table.match(/^plugin_(.+?)_(.+)$/) ?? [];
              if (!pluginName || !tableSuffix) return null;
              return (
                <Route
                  key={page.path}
                  path={page.path}
                  element={
                    <PluginCrudPage
                      pluginName={page.pluginId ?? pluginName.replace(/_/g, "-")}
                      tableSuffix={tableSuffix}
                      columns={page.columns}
                      title={page.title}
                      canCreate={page.canCreate}
                      canEdit={page.canEdit}
                      canDelete={page.canDelete}
                    />
                  }
                />
              );
            })}
          </Route>

          {/* ══ 6. Legacy /staff/* routes ════════════════════════════════════ */}
          <Route
            element={
              <RequireRole roles={[...STAFF_ROLES]}>
                <AppLayout />
              </RequireRole>
            }
          >
            <Route path="/staff/profile" element={<StaffProfilePage />} />
            <Route path="/staff/housekeeping" element={<HousekeepingPage />} />
            <Route path="/staff/orders" element={<OrderManagementPage />} />
            <Route path="/staff/finances" element={<StaffFinancesPage />} />
            <Route path="/staff/inventory" element={<InventoryViewerPage />} />
            <Route path="/staff/roster" element={<RosterPage />} />
          </Route>

          {/* ══ 7. KDS / POS specialty routes ════════════════════════════════ */}
          <Route
            path="/kds"
            element={
              <RequireRole roles={["chef", "admin", "listing_admin", "marketplace_master"]}>
                <AppLayout />
              </RequireRole>
            }
          />
          <Route
            path="/pos"
            element={
              <RequireRole roles={["pos", "admin", "listing_admin", "marketplace_master"]}>
                <AppLayout />
              </RequireRole>
            }
          />
          <Route
            path="/housekeeping"
            element={
              <RequireRole roles={["housekeeping", "admin", "listing_admin", "marketplace_master"]}>
                <AppLayout />
              </RequireRole>
            }
          />

          {/* ══ 8. 404 ════════════════════════════════════════════════════════ */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        {user?.role === "admin" && <ReactQueryDevtools initialIsOpen={false} />}
      </Suspense>
    </>
  );
}
