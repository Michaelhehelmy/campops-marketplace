/**
 * Route Guard Components
 * Shared across all four route groups (public, guest, manager, master).
 * Handles authentication, role checks, and SSO listing-access checks.
 */

import { Link } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/types/api";

// ── Shared Loading Spinner ────────────────────────────────────────────────────

export function PageLoading() {
  return (
    <div className="flex h-screen items-center justify-center" data-testid="page-loading">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}

// ── Access Denied page ────────────────────────────────────────────────────────

export function AccessDenied({
  message = "You don't have permission to view this page.",
}: {
  message?: string;
}) {
  const { user } = useAuth();
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center"
      data-testid="access-denied"
    >
      <div className="text-6xl mb-4">🚫</div>
      <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <Link to={user ? "/" : "/auth/login"}>
        <Button variant="outline" data-testid="access-denied-back">
          {user ? "Go to Home" : "Sign In"}
        </Button>
      </Link>
    </div>
  );
}

// ── RequireAuth ───────────────────────────────────────────────────────────────
/**
 * Redirects to /auth/login if the user is not authenticated.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

// ── RequireRole ───────────────────────────────────────────────────────────────
/**
 * Shows 403 if the authenticated user's role is not in the allowed list.
 */
export function RequireRole({
  children,
  roles,
  message,
}: {
  children: React.ReactNode;
  roles: UserRole[];
  message?: string;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!user || !roles.includes(user.role)) {
    return (
      <AccessDenied
        message={message ?? `This area requires one of the following roles: ${roles.join(", ")}.`}
      />
    );
  }
  return <>{children}</>;
}

// ── RequireListingAccess ──────────────────────────────────────────────────────
/**
 * SSO guard: allows access only if canManageListing(listingId) returns true.
 * marketplace_master always passes; listing_admin/staff pass only for their listing_ids.
 */
export function RequireListingAccess({
  children,
  listingId,
}: {
  children: React.ReactNode;
  listingId: string;
}) {
  const { isAuthenticated, isLoading, canManageListing } = useAuth();
  if (isLoading) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  if (!canManageListing(listingId)) {
    return (
      <AccessDenied
        message={`You don't have access to manage listing "${listingId}". Contact the marketplace master if you believe this is an error.`}
      />
    );
  }
  return <>{children}</>;
}
