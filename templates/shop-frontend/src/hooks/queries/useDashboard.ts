import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";

export interface DashboardOverview {
  totalBookings: number;
  currentGuests: number;
  upcomingArrivals: number;
  availableTents: number;
  occupancyRate: number;
}

export interface RecentActivity {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  created_at: string;
}

export interface GuestDashboard {
  points: number;
  nextStay: any;
  liveBillTotal: number;
}

/**
 * Hook to fetch global dashboard metrics (Admin/Manager)
 */
export function useDashboardOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, "overview"],
    queryFn: () => get<DashboardOverview>("/dashboard/overview"),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

/**
 * Hook to fetch recent activity logs
 */
export function useRecentActivity() {
  return useQuery({
    queryKey: [...queryKeys.dashboard, "activity"],
    queryFn: () => get<RecentActivity[]>("/dashboard/activity"),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch guest-specific dashboard data
 */
export function useGuestDashboard(enabled: boolean = true) {
  return useQuery({
    queryKey: [...queryKeys.dashboard, "guest"],
    queryFn: () => get<GuestDashboard>("/dashboard/guest"),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
