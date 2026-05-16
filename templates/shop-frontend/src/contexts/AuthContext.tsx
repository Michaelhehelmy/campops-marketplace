/**
 * Authentication Context
 * Provides auth state, login/logout methods, permission checking,
 * and SSO listing-access checking for the marketplace multi-group architecture.
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { User, UserRole, AuthResponse, LoginCredentials, SignupData } from "@/types/api";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { socketClient } from "@/lib/socket";
import toast from "react-hot-toast";

/**
 * Auth context type definition
 */
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  /**
   * SSO check: can the current user manage the given listing?
   * Returns true for marketplace_master (unrestricted) or when the
   * listingId appears in user.listing_ids (listing_admin / staff).
   */
  canManageListing: (listingId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Helper to get dashboard path based on role
 */
export const getDashboardPath = (role: string): string => {
  switch (role) {
    case "guest":
      return "/dashboard";
    case "marketplace_master":
      return "/master";
    case "listing_admin":
    case "admin":
    case "manager":
      return "/dashboard";
    case "chef":
      return "/kds";
    case "pos":
      return "/pos";
    case "housekeeping":
      return "/housekeeping";
    default:
      return "/";
  }
};

/**
 * Build a User object from an AuthResponse
 */
function buildUserFromResponse(data: AuthResponse): User {
  return {
    ...data.user,
    role: data.role as UserRole,
    permissions: data.permissions,
    listing_ids: data.listing_ids,
  };
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Check both storage types on init (localStorage for remembered sessions, sessionStorage for temporary)
  const getStoredToken = (): string | null => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  const [token, setToken] = useState<string | null>(getStoredToken());
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Fetch current user
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      if (!token) return null;
      try {
        const response = await get<any>("/auth/me");
        return buildUserFromResponse(response);
      } catch (error) {
        console.error("Auth initialization failed:", error);
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        setToken(null);
        return null;
      }
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes - allow periodic refresh
    refetchOnWindowFocus: true,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await post<AuthResponse>("/auth/login", credentials);
      return response;
    },
    onSuccess: (data, variables) => {
      // Store token in appropriate storage based on rememberMe preference
      const rememberMe = variables.rememberMe ?? true;
      if (rememberMe) {
        localStorage.setItem("token", data.token);
        sessionStorage.removeItem("token"); // Clean up session storage
      } else {
        sessionStorage.setItem("token", data.token);
        localStorage.removeItem("token"); // Clean up local storage
      }
      setToken(data.token);

      const userWithRole = buildUserFromResponse(data);

      // Set query data immediately for instant UI update
      qc.setQueryData(queryKeys.user, userWithRole);

      // Connect WebSocket
      socketClient.connect(data.token);

      toast.success("Welcome back!");

      // Navigate to role-based dashboard
      navigate(getDashboardPath(data.role as UserRole));
    },
    onError: () => {
      toast.error("Invalid credentials");
    },
  });

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const endpoint = data.referral_code ? "/auth/signup-with-referral" : "/auth/signup";
      const response = await post<AuthResponse>(endpoint, data);
      return response;
    },
    onSuccess: (data) => {
      // Store token first
      localStorage.setItem("token", data.token);
      setToken(data.token);

      const userWithRole = buildUserFromResponse(data);

      // Set query data immediately for instant UI update
      qc.setQueryData(queryKeys.user, userWithRole);

      // Connect WebSocket
      socketClient.connect(data.token);

      toast.success("Account created successfully!");
      navigate(getDashboardPath(data.role as UserRole));
    },
    onError: () => {
      toast.error("Failed to create account");
    },
  });

  // Google Login mutation
  const googleLoginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const response = await post<AuthResponse>("/auth/google", { credential });
      return response;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      setToken(data.token);

      const userWithRole = buildUserFromResponse(data);

      qc.setQueryData(queryKeys.user, userWithRole);
      socketClient.connect(data.token);
      toast.success("Welcome back!");
      navigate(getDashboardPath(data.role as UserRole));
    },
    onError: (error: any) => {
      console.error("Google Login Error:", error);
      toast.error(error.response?.data?.error || "Google login failed");
    },
  });

  // Connect to WebSocket when user changes
  useEffect(() => {
    if (token && user) {
      socketClient.connect(token);

      // Join role-based rooms
      if (user.role === "chef") {
        socketClient.joinRoom("kitchen");
      }
      if (user.role === "housekeeping") {
        socketClient.joinRoom("housekeeping");
      }
      if (["pos", "manager", "admin", "listing_admin"].includes(user.role)) {
        socketClient.joinRoom("pos");
      }
    }

    return () => {
      socketClient.disconnect();
    };
  }, [token, user]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await loginMutation.mutateAsync(credentials);
    },
    [loginMutation]
  );

  const signup = useCallback(
    async (data: SignupData) => {
      await signupMutation.mutateAsync(data);
    },
    [signupMutation]
  );

  const googleLogin = useCallback(
    async (credential: string) => {
      await googleLoginMutation.mutateAsync(credential);
    },
    [googleLoginMutation]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setToken(null);
    qc.clear();
    socketClient.disconnect();
    toast.success("Logged out successfully");
  }, [qc]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      const userPerms = user.permissions || [];

      // Global wildcard or admin role check
      if (userPerms.includes("*") || userPerms.includes("admin")) return true;

      // marketplace_master has all permissions
      if (user.role === "marketplace_master") return true;

      // Exact match
      if (userPerms.includes(permission)) return true;

      // Namespace wildcard match (e.g., 'orders.*' matches 'orders.view')
      const parts = permission.split(".");
      if (parts.length > 1) {
        const namespace = parts[0];
        if (userPerms.includes(`${namespace}.*`)) return true;
      }

      return false;
    },
    [user]
  );

  /**
   * SSO listing access check.
   * marketplace_master can manage any listing.
   * listing_admin and staff can manage listings listed in their listing_ids.
   * Legacy admin role (single-tenant) is treated as listing_admin.
   */
  const canManageListing = useCallback(
    (listingId: string): boolean => {
      if (!user) return false;
      if (user.role === "marketplace_master") return true;
      if (["listing_admin", "admin", "manager", "staff"].includes(user.role)) {
        return user.listing_ids?.includes(listingId) ?? false;
      }
      return false;
    },
    [user]
  );

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    googleLogin,
    logout,
    hasPermission,
    canManageListing,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
