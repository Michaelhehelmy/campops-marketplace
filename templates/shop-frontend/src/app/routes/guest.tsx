/**
 * Guest Routes
 * Accessible to authenticated guests (role === 'guest').
 * Provides the guest portal: reservations, orders, profile, and
 * contextual listing access during active stays.
 */

import { lazy } from "react";
import { Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireRole } from "./guards";

// Guest portal pages
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const GuestReservationsPage = lazy(() => import("@/pages/guest/GuestReservationsPage"));
const GuestProfilePage = lazy(() => import("@/pages/guest/GuestProfilePage"));
const GuestInvoicesPage = lazy(() => import("@/pages/guest/GuestInvoicesPage"));
const ActivitiesPage = lazy(() => import("@/pages/guest/ActivitiesPage"));
const GuestFollowingPage = lazy(() => import("@/pages/guest/GuestFollowingPage"));
const GuestListingContextPage = lazy(() => import("@/pages/guest/GuestListingContextPage"));

// Existing guest pages kept for full coverage
const GuestStayPage = lazy(() => import("@/pages/guest/GuestStayPage"));
const LiveBillPage = lazy(() => import("@/pages/guest/LiveBillPage"));
const PointsPage = lazy(() => import("@/pages/guest/PointsPage"));
const BuyPointsPage = lazy(() => import("@/pages/guest/BuyPointsPage"));
const GuestReferralsPage = lazy(() => import("@/pages/guest/GuestReferralsPage"));
const GuestTransfersPage = lazy(() => import("@/pages/guest/GuestTransfersPage"));
const FeedbackPage = lazy(() => import("@/pages/guest/FeedbackPage"));
const MiningPage = lazy(() => import("@/pages/guest/MiningPage"));
const GuestChangePasswordPage = lazy(() => import("@/pages/guest/GuestChangePasswordPage"));

const GUEST_ROLES = ["guest", "admin", "listing_admin"] as const;

/**
 * Guest routes — all protected by RequireRole.
 * Renders inside the shared AppLayout (sidebar + main content).
 */
export function GuestRoutes() {
  return (
    <Route
      element={
        <RequireRole roles={[...GUEST_ROLES]}>
          <AppLayout />
        </RequireRole>
      }
    >
      {/* ── Core guest dashboard ─────────────────────────── */}
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* ── Reservations ─────────────────────────────────── */}
      <Route path="/dashboard/reservations" element={<GuestReservationsPage />} />
      <Route path="/dashboard/reservations/:id" element={<GuestStayPage />} />

      {/* ── Orders ───────────────────────────────────────── */}
      <Route path="/dashboard/orders" element={<GuestInvoicesPage />} />

      {/* ── Profile & settings ───────────────────────────── */}
      <Route path="/dashboard/profile" element={<GuestProfilePage />} />
      <Route path="/dashboard/change-password" element={<GuestChangePasswordPage />} />

      {/* ── Following ────────────────────────────────────── */}
      <Route path="/dashboard/following" element={<GuestFollowingPage />} />

      {/* ── Contextual listing view (active stay) ────────── */}
      <Route path="/dashboard/listing/:slug" element={<GuestListingContextPage />} />

      {/* ── Legacy guest routes ───────────────────────────── */}
      <Route path="/guest/profile" element={<GuestProfilePage />} />
      <Route path="/guest/stay" element={<GuestStayPage />} />
      <Route path="/guest/invoices" element={<GuestInvoicesPage />} />
      <Route path="/guest/bill" element={<LiveBillPage />} />
      <Route path="/guest/points" element={<PointsPage />} />
      <Route path="/guest/buy-points" element={<BuyPointsPage />} />
      <Route path="/guest/referrals" element={<GuestReferralsPage />} />
      <Route path="/guest/transfers" element={<GuestTransfersPage />} />
      <Route path="/guest/activities" element={<ActivitiesPage />} />
      <Route path="/guest/feedback" element={<FeedbackPage />} />
      <Route path="/guest/mining" element={<MiningPage />} />
      <Route path="/guest/change-password" element={<GuestChangePasswordPage />} />
    </Route>
  );
}
