/**
 * Activities React Query hooks
 * For excursions and marketplace features
 */

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import type { Activity, POSItem } from "@/types/api";

// ============================================
// ACTIVITIES (EXCURSIONS)
// ============================================

export function usePublicActivities() {
  return useQuery({
    queryKey: ["public", "activities"],
    queryFn: async () => {
      const response = await get<{ data: Activity[] }>("/public/activities");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePublicActivitySchedules(options?: { start_date?: string; end_date?: string }) {
  const queryString = new URLSearchParams();
  if (options?.start_date) queryString.append("start_date", options.start_date);
  if (options?.end_date) queryString.append("end_date", options.end_date);

  return useQuery({
    queryKey: ["public", "activity_schedules", options || {}],
    queryFn: async () => {
      const url = `/public/activity_schedules${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<{
        data: Array<
          Activity & {
            activity_name: string;
            activity_description: string;
            base_price: number;
            duration_minutes: number;
            activity_category: string;
            scheduled_date: string;
            available_spots: number;
          }
        >;
      }>(url);
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// POS ITEMS (MARKETPLACE)
// ============================================

export function usePublicPOSItems(options?: { category?: string }) {
  const queryString = new URLSearchParams();
  if (options?.category) queryString.append("category", options.category);

  return useQuery({
    queryKey: ["public", "pos_items", options || {}],
    queryFn: async () => {
      const url = `/public/pos_items${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<{ data: POSItem[] }>(url);
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useMarketplaceItems() {
  return useQuery({
    queryKey: ["public", "marketplace"],
    queryFn: async () => {
      // Try to get retail category items, fallback to all items
      try {
        const response = await get<{ data: POSItem[] }>("/public/pos_items?category=retail");
        return response.data;
      } catch {
        // Fallback: get all items and filter client-side if needed
        const response = await get<{ data: POSItem[] }>("/public/pos_items");
        return response.data;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
