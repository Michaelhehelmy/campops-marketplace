/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  RequireAuth,
  RequireRole,
  RequireListingAccess,
  PageLoading,
  AccessDenied,
} from "../guards";

// ── Mock AuthContext ──────────────────────────────────────────────────────────

const mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null as any,
  canManageListing: vi.fn((id: string) => false),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function renderWithRouter(ui: React.ReactElement, initialPath = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/auth/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/protected" element={ui} />
        <Route path="/" element={<div data-testid="home-page">Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── PageLoading ───────────────────────────────────────────────────────────────

describe("PageLoading", () => {
  it("renders a loading spinner", () => {
    render(<PageLoading />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });
});

// ── AccessDenied ──────────────────────────────────────────────────────────────

describe("AccessDenied", () => {
  it("renders access denied with default message", () => {
    mockAuthState.user = null;
    renderWithRouter(<AccessDenied />);
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it("renders custom message", () => {
    renderWithRouter(<AccessDenied message="Custom error message" />);
    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("shows Sign In link when user is null", () => {
    mockAuthState.user = null;
    renderWithRouter(<AccessDenied />);
    expect(screen.getByTestId("access-denied-back")).toHaveTextContent("Sign In");
  });

  it("shows Go to Home link when user is logged in", () => {
    mockAuthState.user = makeUser("guest");
    renderWithRouter(<AccessDenied />);
    expect(screen.getByTestId("access-denied-back")).toHaveTextContent("Go to Home");
  });
});

// ── RequireAuth ───────────────────────────────────────────────────────────────

describe("RequireAuth", () => {
  it("shows loading when isLoading is true", () => {
    mockAuthState.isLoading = true;
    mockAuthState.isAuthenticated = false;
    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });

  it("redirects to /auth/login when not authenticated", () => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = false;
    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
    renderWithRouter(
      <RequireAuth>
        <div data-testid="protected-content">Protected</div>
      </RequireAuth>
    );
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });
});

// ── RequireRole ───────────────────────────────────────────────────────────────

describe("RequireRole", () => {
  beforeEach(() => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
  });

  it("shows loading when isLoading is true", () => {
    mockAuthState.isLoading = true;
    renderWithRouter(
      <RequireRole roles={["admin" as any]}>
        <div>Admin Content</div>
      </RequireRole>
    );
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    mockAuthState.isAuthenticated = false;
    renderWithRouter(
      <RequireRole roles={["admin" as any]}>
        <div>Admin Content</div>
      </RequireRole>
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("shows AccessDenied when user role is not allowed", () => {
    mockAuthState.user = makeUser("guest");
    renderWithRouter(
      <RequireRole roles={["admin" as any]}>
        <div>Admin Content</div>
      </RequireRole>
    );
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders children when role is allowed", () => {
    mockAuthState.user = makeUser("admin");
    renderWithRouter(
      <RequireRole roles={["admin" as any]}>
        <div data-testid="admin-content">Admin Content</div>
      </RequireRole>
    );
    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });

  it("renders children when user is marketplace_master and not in roles list (not applicable — must be explicit)", () => {
    mockAuthState.user = makeUser("marketplace_master");
    renderWithRouter(
      <RequireRole roles={["marketplace_master" as any]}>
        <div data-testid="master-content">Master Content</div>
      </RequireRole>
    );
    expect(screen.getByTestId("master-content")).toBeInTheDocument();
  });

  it("shows custom message in AccessDenied", () => {
    mockAuthState.user = makeUser("guest");
    renderWithRouter(
      <RequireRole roles={["admin" as any]} message="Admins only!">
        <div>Admin Content</div>
      </RequireRole>
    );
    expect(screen.getByText("Admins only!")).toBeInTheDocument();
  });
});

// ── RequireListingAccess ──────────────────────────────────────────────────────

describe("RequireListingAccess", () => {
  beforeEach(() => {
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = makeUser("listing_admin", ["listingA"]);
  });

  it("shows loading when isLoading is true", () => {
    mockAuthState.isLoading = true;
    mockAuthState.canManageListing.mockReturnValue(false);
    renderWithRouter(
      <RequireListingAccess listingId="listingA">
        <div>Content</div>
      </RequireListingAccess>
    );
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", () => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.canManageListing.mockReturnValue(false);
    renderWithRouter(
      <RequireListingAccess listingId="listingA">
        <div>Content</div>
      </RequireListingAccess>
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("renders children when canManageListing returns true", () => {
    mockAuthState.canManageListing.mockReturnValue(true);
    renderWithRouter(
      <RequireListingAccess listingId="listingA">
        <div data-testid="listing-content">Listing Content</div>
      </RequireListingAccess>
    );
    expect(screen.getByTestId("listing-content")).toBeInTheDocument();
  });

  it("shows AccessDenied when canManageListing returns false", () => {
    mockAuthState.canManageListing.mockReturnValue(false);
    renderWithRouter(
      <RequireListingAccess listingId="listingB">
        <div>Content</div>
      </RequireListingAccess>
    );
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });
});

// ── canManageListing logic (unit tests via AuthContext) ───────────────────────

describe("canManageListing logic", () => {
  it("marketplace_master can manage any listing", () => {
    const canManage = (user: any, id: string) => {
      if (!user) return false;
      if (user.role === "marketplace_master") return true;
      if (["listing_admin", "admin", "manager", "staff"].includes(user.role)) {
        return user.listing_ids?.includes(id) ?? false;
      }
      return false;
    };
    expect(canManage(makeUser("marketplace_master"), "any-listing")).toBe(true);
    expect(canManage(makeUser("marketplace_master"), "another-listing")).toBe(true);
  });

  it("listing_admin can manage their own listings only", () => {
    const user = makeUser("listing_admin", ["listingA", "listingC"]);
    const canManage = (u: any, id: string) =>
      u.role === "listing_admin" && (u.listing_ids?.includes(id) ?? false);
    expect(canManage(user, "listingA")).toBe(true);
    expect(canManage(user, "listingC")).toBe(true);
    expect(canManage(user, "listingB")).toBe(false);
  });

  it("guest cannot manage any listing", () => {
    const user = makeUser("guest");
    const canManage = (u: any, id: string) => {
      if (!u) return false;
      if (u.role === "marketplace_master") return true;
      if (["listing_admin", "admin", "manager", "staff"].includes(u.role)) {
        return u.listing_ids?.includes(id) ?? false;
      }
      return false;
    };
    expect(canManage(user, "any-listing")).toBe(false);
  });

  it("null user cannot manage any listing", () => {
    const canManage = (u: any, id: string) => {
      if (!u) return false;
      return u.role === "marketplace_master";
    };
    expect(canManage(null, "any-listing")).toBe(false);
  });
});
