/**
 * @vitest-environment jsdom
 *
 * Route contract tests: public, guest, manager, master route groups.
 * Tests cover:
 *  - Correct page renders at each path
 *  - Role-based access (allow / redirect / 403)
 *  - SSO: listing_admin can manage their listing but not others
 *  - marketplace_master can access any /manage/:id and all /master/* routes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";

// ── Shared mock auth state ────────────────────────────────────────────────────

const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  user: null as any,
  canManageListing: vi.fn((_id: string) => false),
  hasPermission: vi.fn(() => false),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
  getDashboardPath: (role: string) => (role === "marketplace_master" ? "/master" : "/dashboard"),
}));

// ── Stub all lazy-loaded page components ─────────────────────────────────────

vi.mock("@/pages/marketplace/MarketplaceHomePage", () => ({
  default: () => <div data-testid="marketplace-home">MarketplaceHome</div>,
}));
vi.mock("@/pages/marketplace/SearchResultsPage", () => ({
  default: () => <div data-testid="search-results">SearchResults</div>,
}));
vi.mock("@/pages/marketplace/ListingProfilePage", () => ({
  default: () => <div data-testid="listing-profile">ListingProfile</div>,
}));
vi.mock("@/pages/auth/LoginPage", () => ({
  default: () => <div data-testid="login-page">Login</div>,
}));
vi.mock("@/pages/auth/SignupPage", () => ({
  default: () => <div data-testid="signup-page">Signup</div>,
}));
vi.mock("@/pages/auth/ForgotPasswordPage", () => ({
  default: () => <div data-testid="forgot-password-page">ForgotPassword</div>,
}));
vi.mock("@/pages/auth/ResetPasswordPage", () => ({
  default: () => <div data-testid="reset-password-page">ResetPassword</div>,
}));
vi.mock("@/pages/public/BookingPage", () => ({
  default: () => <div data-testid="booking-page">BookingPage</div>,
}));
vi.mock("@/pages/public/PublicRoomsPage", () => ({
  default: () => <div data-testid="public-rooms">PublicRooms</div>,
}));
vi.mock("@/pages/public/ContactPage", () => ({
  default: () => <div data-testid="contact-page">Contact</div>,
}));
vi.mock("@/pages/public/GalleryPage", () => ({
  default: () => <div data-testid="gallery-page">Gallery</div>,
}));
vi.mock("@/pages/public/ExcursionsPage", () => ({
  default: () => <div data-testid="excursions-page">Excursions</div>,
}));
vi.mock("@/pages/public/MenuPage", () => ({
  default: () => <div data-testid="menu-page">Menu</div>,
}));
vi.mock("@/pages/public/BlogPage", () => ({
  default: () => <div data-testid="blog-page">Blog</div>,
}));
vi.mock("@/pages/public/AvailabilityPage", () => ({
  default: () => <div data-testid="availability-page">Availability</div>,
}));
vi.mock("@/pages/public/PublicFolioPage", () => ({
  default: () => <div data-testid="folio-page">Folio</div>,
}));
vi.mock("@/pages/public/MarketplacePage", () => ({
  default: () => <div data-testid="marketplace-page">Marketplace</div>,
}));
vi.mock("@/pages/DashboardPage", () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock("@/pages/guest/GuestProfilePage", () => ({
  default: () => <div data-testid="guest-profile">GuestProfile</div>,
}));
vi.mock("@/pages/guest/GuestReservationsPage", () => ({
  default: () => <div data-testid="guest-reservations">GuestReservations</div>,
}));
vi.mock("@/pages/guest/GuestFollowingPage", () => ({
  default: () => <div data-testid="guest-following">GuestFollowing</div>,
}));
vi.mock("@/pages/guest/GuestListingContextPage", () => ({
  default: () => <div data-testid="guest-listing-context">GuestListingContext</div>,
}));
vi.mock("@/pages/guest/GuestStayPage", () => ({
  default: () => <div data-testid="guest-stay">GuestStay</div>,
}));
vi.mock("@/pages/guest/GuestInvoicesPage", () => ({
  default: () => <div data-testid="guest-invoices">GuestInvoices</div>,
}));
vi.mock("@/pages/guest/LiveBillPage", () => ({
  default: () => <div data-testid="live-bill">LiveBill</div>,
}));
vi.mock("@/pages/guest/PointsPage", () => ({
  default: () => <div data-testid="points-page">Points</div>,
}));
vi.mock("@/pages/guest/BuyPointsPage", () => ({
  default: () => <div data-testid="buy-points">BuyPoints</div>,
}));
vi.mock("@/pages/guest/GuestReferralsPage", () => ({
  default: () => <div data-testid="guest-referrals">GuestReferrals</div>,
}));
vi.mock("@/pages/guest/GuestTransfersPage", () => ({
  default: () => <div data-testid="guest-transfers">GuestTransfers</div>,
}));
vi.mock("@/pages/guest/ActivitiesPage", () => ({
  default: () => <div data-testid="activities-page">Activities</div>,
}));
vi.mock("@/pages/guest/FeedbackPage", () => ({
  default: () => <div data-testid="feedback-page">Feedback</div>,
}));
vi.mock("@/pages/guest/MiningPage", () => ({
  default: () => <div data-testid="mining-page">Mining</div>,
}));
vi.mock("@/pages/guest/GuestChangePasswordPage", () => ({
  default: () => <div data-testid="change-password-page">ChangePassword</div>,
}));
vi.mock("@/pages/manager/ListingOverviewPage", () => ({
  default: () => <div data-testid="listing-overview">ListingOverview</div>,
}));
vi.mock("@/pages/manager/MaintenancePage", () => ({
  default: () => <div data-testid="maintenance-page">Maintenance</div>,
}));
vi.mock("@/pages/admin/RoomManagerPage", () => ({
  default: () => <div data-testid="room-manager">RoomManager</div>,
}));
vi.mock("@/pages/admin/UserManagementPage", () => ({
  default: () => <div data-testid="user-management">UserManagement</div>,
}));
vi.mock("@/pages/admin/PluginsPage", () => ({
  default: () => <div data-testid="plugins-page">Plugins</div>,
}));
vi.mock("@/pages/admin/SettingsPage", () => ({
  default: () => <div data-testid="settings-page">Settings</div>,
}));
vi.mock("@/pages/admin/AuditLogsPage", () => ({
  default: () => <div data-testid="audit-logs">AuditLogs</div>,
}));
vi.mock("@/pages/admin/AdminFinancesPage", () => ({
  default: () => <div data-testid="admin-finances">AdminFinances</div>,
}));
vi.mock("@/pages/master/MasterDashboardPage", () => ({
  default: () => <div data-testid="master-dashboard">MasterDashboard</div>,
}));
vi.mock("@/pages/master/AllListingsPage", () => ({
  default: () => <div data-testid="all-listings">AllListings</div>,
}));
vi.mock("@/pages/master/ListingDeepDivePage", () => ({
  default: () => <div data-testid="listing-deep-dive">ListingDeepDive</div>,
}));
vi.mock("@/pages/master/FeatureConfigPage", () => ({
  default: () => <div data-testid="feature-config">FeatureConfig</div>,
}));
vi.mock("@/pages/master/CommissionsPage", () => ({
  default: () => <div data-testid="commissions-page">Commissions</div>,
}));
vi.mock("@/pages/staff/OrderManagementPage", () => ({
  default: () => <div data-testid="order-management">OrderManagement</div>,
}));
vi.mock("@/pages/staff/HousekeepingPage", () => ({
  default: () => <div data-testid="housekeeping-page">Housekeeping</div>,
}));
vi.mock("@/pages/staff/RosterPage", () => ({
  default: () => <div data-testid="roster-page">Roster</div>,
}));

// ── Mock layout components to just render their children ─────────────────────

vi.mock("@/components/layout/PublicLayout", () => ({
  PublicLayout: () => {
    const { Outlet } = require("react-router-dom");
    return (
      <div data-testid="public-layout">
        <Outlet />
      </div>
    );
  },
}));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: () => {
    const { Outlet } = require("react-router-dom");
    return (
      <div data-testid="app-layout">
        <Outlet />
      </div>
    );
  },
}));
vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// ── Route imports (after all mocks) ──────────────────────────────────────────

import { PublicRoutes } from "../public";
import { GuestRoutes } from "../guest";
import { ManagerRoutes } from "../manager";
import { MasterRoutes } from "../master";

// ── Helper ────────────────────────────────────────────────────────────────────

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div data-testid="suspense-loading">Loading...</div>}>
        <Routes>
          {PublicRoutes()}
          {GuestRoutes()}
          {ManagerRoutes()}
          {MasterRoutes()}
          <Route path="/auth/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </Suspense>
    </MemoryRouter>
  );
}

function makeUser(role: string, listing_ids?: string[]) {
  return {
    id: "u1",
    email: "test@test.com",
    full_name: "Test",
    role,
    permissions: [],
    listing_ids,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("Public Routes", () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
    mockAuth.user = null;
  });

  it("renders MarketplaceHomePage at /", async () => {
    renderAt("/");
    await waitFor(() => expect(screen.getByTestId("marketplace-home")).toBeInTheDocument());
  });

  it("renders SearchResultsPage at /search", async () => {
    renderAt("/search");
    await waitFor(() => expect(screen.getByTestId("search-results")).toBeInTheDocument());
  });

  it("renders ListingProfilePage at /listing/:slug", async () => {
    renderAt("/listing/acacia-camp");
    await waitFor(() => expect(screen.getByTestId("listing-profile")).toBeInTheDocument());
  });

  it("renders BookingPage at /listing/:slug/booking", async () => {
    renderAt("/listing/acacia-camp/booking");
    await waitFor(() => expect(screen.getByTestId("booking-page")).toBeInTheDocument());
  });

  it("renders LoginPage at /auth/login", async () => {
    renderAt("/auth/login");
    await waitFor(() => expect(screen.getAllByTestId("login-page").length).toBeGreaterThan(0));
  });

  it("renders SignupPage at /auth/signup", async () => {
    renderAt("/auth/signup");
    await waitFor(() => expect(screen.getByTestId("signup-page")).toBeInTheDocument());
  });

  it("renders ForgotPasswordPage at /auth/forgot-password", async () => {
    renderAt("/auth/forgot-password");
    await waitFor(() => expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument());
  });

  it("redirects /login to /auth/login", async () => {
    renderAt("/login");
    await waitFor(() => expect(screen.getAllByTestId("login-page").length).toBeGreaterThan(0));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GUEST ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("Guest Routes", () => {
  it("redirects unauthenticated user from /dashboard to /auth/login", async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    renderAt("/dashboard");
    await waitFor(() => expect(screen.getByTestId("login-page")).toBeInTheDocument());
  });

  it("renders Dashboard for authenticated guest", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("guest");
    renderAt("/dashboard");
    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());
  });

  it("renders GuestReservationsPage at /dashboard/reservations", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("guest");
    renderAt("/dashboard/reservations");
    await waitFor(() => expect(screen.getByTestId("guest-reservations")).toBeInTheDocument());
  });

  it("renders GuestFollowingPage at /dashboard/following", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("guest");
    renderAt("/dashboard/following");
    await waitFor(() => expect(screen.getByTestId("guest-following")).toBeInTheDocument());
  });

  it("shows access denied for marketplace_master trying guest routes", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/dashboard");
    await waitFor(() => expect(screen.getByTestId("access-denied")).toBeInTheDocument());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MANAGER ROUTES — SSO
// ═════════════════════════════════════════════════════════════════════════════

describe("Manager Routes (SSO)", () => {
  it("redirects unauthenticated to login", async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    mockAuth.canManageListing.mockReturnValue(false);
    renderAt("/manage/listingA");
    await waitFor(() => expect(screen.getByTestId("login-page")).toBeInTheDocument());
  });

  it("renders ListingOverviewPage for listing_admin who can manage listingA", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("listing_admin", ["listingA"]);
    mockAuth.canManageListing.mockImplementation((id) => id === "listingA");
    renderAt("/manage/listingA");
    await waitFor(() => expect(screen.getByTestId("listing-overview")).toBeInTheDocument());
  });

  it("shows AccessDenied for listing_admin trying to access listingB", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("listing_admin", ["listingA"]);
    mockAuth.canManageListing.mockImplementation((id) => id === "listingA");
    renderAt("/manage/listingB");
    await waitFor(() => expect(screen.getByTestId("access-denied")).toBeInTheDocument());
  });

  it("renders ListingOverviewPage for marketplace_master accessing any listing", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    mockAuth.canManageListing.mockReturnValue(true);
    renderAt("/manage/any-listing-id");
    await waitFor(() => expect(screen.getByTestId("listing-overview")).toBeInTheDocument());
  });

  it("renders RoomManagerPage at /manage/:id/rooms", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("listing_admin", ["listingA"]);
    mockAuth.canManageListing.mockReturnValue(true);
    renderAt("/manage/listingA/rooms");
    await waitFor(() => expect(screen.getByTestId("room-manager")).toBeInTheDocument());
  });

  it("renders MaintenancePage at /manage/:id/maintenance", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("listing_admin", ["listingA"]);
    mockAuth.canManageListing.mockReturnValue(true);
    renderAt("/manage/listingA/maintenance");
    await waitFor(() => expect(screen.getByTestId("maintenance-page")).toBeInTheDocument());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MASTER ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("Master Routes", () => {
  it("redirects unauthenticated to login", async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    renderAt("/master");
    await waitFor(() => expect(screen.getByTestId("login-page")).toBeInTheDocument());
  });

  it("shows AccessDenied for listing_admin on /master", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("listing_admin", ["listingA"]);
    renderAt("/master");
    await waitFor(() => expect(screen.getByTestId("access-denied")).toBeInTheDocument());
  });

  it("shows AccessDenied for guest on /master", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("guest");
    renderAt("/master");
    await waitFor(() => expect(screen.getByTestId("access-denied")).toBeInTheDocument());
  });

  it("renders MasterDashboardPage for marketplace_master", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/master");
    await waitFor(() => expect(screen.getByTestId("master-dashboard")).toBeInTheDocument());
  });

  it("renders AllListingsPage at /master/listings", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/master/listings");
    await waitFor(() => expect(screen.getByTestId("all-listings")).toBeInTheDocument());
  });

  it("renders ListingDeepDivePage at /master/listings/:id", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/master/listings/listing-001");
    await waitFor(() => expect(screen.getByTestId("listing-deep-dive")).toBeInTheDocument());
  });

  it("renders CommissionsPage at /master/commissions", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/master/commissions");
    await waitFor(() => expect(screen.getByTestId("commissions-page")).toBeInTheDocument());
  });

  it("renders FeatureConfigPage at /master/feature-config", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/master/feature-config");
    await waitFor(() => expect(screen.getByTestId("feature-config")).toBeInTheDocument());
  });

  it("renders AuditLogsPage at /master/logs", async () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = makeUser("marketplace_master");
    renderAt("/master/logs");
    await waitFor(() => expect(screen.getByTestId("audit-logs")).toBeInTheDocument());
  });
});
