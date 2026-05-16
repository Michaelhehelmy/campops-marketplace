// @vitest-environment jsdom
/**
 * Unit tests for src/contexts/AuthContext.tsx
 * Tests: login flow, logout, token storage, hasPermission, getDashboardPath.
 */

import React from "react";
import { describe, it, vi, beforeEach } from "vitest";
import { screen, waitFor, act, renderHook, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("@/lib/api", () => {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  };
});

vi.mock("@/lib/socket", () => ({
  socketClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinRoom: vi.fn(),
  },
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, useNavigate: () => vi.fn() };
});

import { get, post } from "@/lib/api";
import { socketClient } from "@/lib/socket";
import { AuthProvider, useAuth, getDashboardPath } from "../AuthContext";

// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: "u1",
  email: "admin@test.com",
  full_name: "Admin User",
  role: "admin",
  permissions: ["*"],
};

const AUTH_RESPONSE = {
  token: "test-jwt-token",
  user: ADMIN_USER,
  role: "admin",
  permissions: ["*"],
};

function makeConsumer() {
  const Consumer = () => {
    const { user, isAuthenticated, isLoading } = useAuth();
    return (
      <div>
        <span data-testid="loading">{String(isLoading)}</span>
        <span data-testid="authenticated">{String(isAuthenticated)}</span>
        <span data-testid="role">{user?.role ?? "none"}</span>
      </div>
    );
  };
  return Consumer;
}

async function wrapWithAuth(ui: React.ReactElement, initialUser: any = null) {
  if (initialUser) {
    localStorage.setItem("token", "dummy-token");
    (get as any).mockResolvedValue({
      user: initialUser,
      role: initialUser.role,
      permissions: initialUser.permissions || [],
      listing_ids: initialUser.listing_ids || [],
    });
  } else {
    localStorage.removeItem("token");
    (get as any).mockResolvedValue({ user: null });
  }

  let result: any;
  await act(async () => {
    result = render(<AuthProvider>{ui}</AuthProvider>);
  });

  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  cleanup();
});

// =============================================================================
// getDashboardPath
// =============================================================================

describe("getDashboardPath", () => {
  it("returns /dashboard for admin", () => expect(getDashboardPath("admin")).toBe("/dashboard"));
  it("returns /dashboard for manager", () =>
    expect(getDashboardPath("manager")).toBe("/dashboard"));
  it("returns /dashboard for guest", () => expect(getDashboardPath("guest")).toBe("/dashboard"));
  it("returns /master for marketplace_master", () =>
    expect(getDashboardPath("marketplace_master")).toBe("/master"));
  it("returns /kds for chef", () => expect(getDashboardPath("chef")).toBe("/kds"));
  it("returns /pos for pos role", () => expect(getDashboardPath("pos")).toBe("/pos"));
  it("returns /housekeeping for housekeeping role", () =>
    expect(getDashboardPath("housekeeping")).toBe("/housekeeping"));
  it("returns / for unknown roles", () => expect(getDashboardPath("unknown")).toBe("/"));
});

// =============================================================================
// AuthProvider
// =============================================================================

describe("AuthProvider", () => {
  it("starts with isAuthenticated=false when no token is stored", async () => {
    const Consumer = makeConsumer();
    await wrapWithAuth(<Consumer />);
    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    });
  });

  it("stores the token in localStorage and updates auth state on login", async () => {
    (post as any).mockResolvedValue(AUTH_RESPONSE);
    (get as any).mockResolvedValue({ user: ADMIN_USER, role: "admin", permissions: ["*"] });

    const LoginBtn = () => {
      const { login } = useAuth();
      return (
        <button onClick={() => login({ email: "admin@test.com", password: "pw" })}>Login</button>
      );
    };

    const user = userEvent.setup();
    await wrapWithAuth(<LoginBtn />);
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("test-jwt-token");
    });
    expect(socketClient.connect).toHaveBeenCalledWith("test-jwt-token");
  });

  it("clears tokens on logout", async () => {
    localStorage.setItem("token", "stored-token");
    const LogoutBtn = () => {
      const { logout } = useAuth();
      return <button onClick={logout}>Logout</button>;
    };

    const user = userEvent.setup();
    await wrapWithAuth(<LogoutBtn />, ADMIN_USER);
    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(localStorage.getItem("token")).toBeNull();
    expect(socketClient.disconnect).toHaveBeenCalled();
  });

  describe("Permissions", () => {
    const createWrapper = () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });
      return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );
    };

    it("hasPermission handles namespace wildcards", async () => {
      localStorage.setItem("token", "t1");
      (get as any).mockResolvedValue({
        user: { id: "1", role: "mgr", permissions: ["orders.*"] },
        role: "mgr",
        permissions: ["orders.*"],
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user?.permissions).toContain("orders.*");
      expect(result.current.hasPermission("orders.view")).toBe(true);
      expect(result.current.hasPermission("users.view")).toBe(false);
    });

    it("canManageListing handles roles", async () => {
      localStorage.setItem("token", "t2");
      (get as any).mockResolvedValue({
        user: { id: "1", role: "marketplace_master", permissions: ["*"] },
        role: "marketplace_master",
        permissions: ["*"],
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.user?.role).toBe("marketplace_master");
      expect(result.current.canManageListing("any")).toBe(true);
    });

    it("canManageListing handles listing-specific roles", async () => {
      localStorage.setItem("token", "t3");
      (get as any).mockResolvedValue({
        user: { id: "1", role: "listing_admin", listing_ids: ["L1"] },
        role: "listing_admin",
        listing_ids: ["L1"],
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canManageListing("L1")).toBe(true);
      expect(result.current.canManageListing("L2")).toBe(false);
    });
  });

  it("handles login mutation error", async () => {
    (post as any).mockRejectedValue(new Error("Login failed"));
    const LoginBtn = () => {
      const { login } = useAuth();
      return (
        <button
          onClick={async () => {
            try {
              await login({ email: "bad@test.com", password: "pw" });
            } catch (e) {}
          }}
        >
          Login
        </button>
      );
    };
    const user = userEvent.setup();
    await wrapWithAuth(<LoginBtn />);
    await user.click(screen.getByRole("button", { name: "Login" }));
  });

  it("handles signup mutation error", async () => {
    (post as any).mockRejectedValue(new Error("Signup failed"));
    const SignupBtn = () => {
      const { signup } = useAuth();
      return (
        <button
          onClick={async () => {
            try {
              await signup({ email: "new@u.com", password: "p", full_name: "N" });
            } catch (e) {}
          }}
        >
          Signup
        </button>
      );
    };
    const user = userEvent.setup();
    await wrapWithAuth(<SignupBtn />);
    await user.click(screen.getByRole("button", { name: "Signup" }));
  });

  it("handles googleLogin mutation error", async () => {
    (post as any).mockRejectedValue(new Error("Google failed"));
    const GoogleBtn = () => {
      const { googleLogin } = useAuth();
      return (
        <button
          onClick={async () => {
            try {
              await googleLogin("token");
            } catch (e) {}
          }}
        >
          Google
        </button>
      );
    };
    const user = userEvent.setup();
    await wrapWithAuth(<GoogleBtn />);
    await user.click(screen.getByRole("button", { name: "Google" }));
  });
});

describe("useAuth hook", () => {
  it("throws error when used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );
    spy.mockRestore();
  });
});
