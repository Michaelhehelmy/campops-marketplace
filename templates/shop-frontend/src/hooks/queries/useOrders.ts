/**
 * POS and Order React Query hooks
 */

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { queueIfOffline, offlineQueue } from "@/lib/offlineQueue";
import type { Order, POSItem, ApiResponse, PaginatedResponse } from "@/types/api";

// ============================================
// POS ITEMS (Menu)
// ============================================

/**
 * Fetch POS items (menu) with availability
 */
export function usePosItems() {
  return useQuery({
    queryKey: queryKeys.posItems,
    queryFn: async () => {
      const response = await get<PaginatedResponse<POSItem>>("/pos");
      return response.data;
    },
    staleTime: 1000 * 60,
  });
}

// ============================================
// ORDERS
// ============================================

/**
 * Fetch all orders with optional filtering
 */
export function useOrders(options?: { status?: string; guest_id?: string }) {
  const queryString = new URLSearchParams();
  if (options?.status) queryString.append("status", options.status);
  if (options?.guest_id) queryString.append("guest_id", options.guest_id);

  return useQuery({
    queryKey: [...queryKeys.orders, options || {}],
    queryFn: async () => {
      const url = `/orders${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<PaginatedResponse<Order>>(url);
      return response;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Fetch kitchen orders (for kitchen display)
 */
export function useKitchenOrders() {
  return useQuery({
    queryKey: queryKeys.kitchenOrders,
    queryFn: async () => {
      const response = await get<PaginatedResponse<Order>>(
        "/orders?status=placed,preparing,ready&requires_preparation=true"
      );
      return response.data;
    },
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

/**
 * Create order mutation — queues offline if no network connection
 */
export function useCreateOrder() {
  const qc = useQueryClient();

  // Auto-sync pending queue when connection is restored
  useEffect(() => {
    const handleOnline = async () => {
      const pending = await offlineQueue.getPendingCount();
      if (pending > 0) {
        await offlineQueue.sync();
        qc.invalidateQueries({ queryKey: queryKeys.orders });
        qc.invalidateQueries({ queryKey: queryKeys.kitchenOrders });
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [qc]);

  return useMutation({
    mutationFn: async (data: Partial<Order>) => {
      const result = await queueIfOffline("createOrder", "/api/orders", "POST", data, async () => {
        const response = await post<ApiResponse<Order>>("/orders", data);
        return response.data;
      });
      // If queued offline return a stub so callers don't crash
      if (result && (result as { queued: boolean }).queued) return null;
      return result as Order;
    },
    onSuccess: (data) => {
      if (!data) return; // offline-queued — skip cache invalidation until sync
      qc.invalidateQueries({ queryKey: queryKeys.orders });
      qc.invalidateQueries({ queryKey: queryKeys.kitchenOrders });
    },
  });
}

/**
 * Update order status mutation
 */
export function useUpdateOrderStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "placed" | "preparing" | "ready" | "delivered";
    }) => {
      const response = await patch<ApiResponse<Order>>(`/orders/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.order(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.orders });
      qc.invalidateQueries({ queryKey: queryKeys.kitchenOrders });
    },
  });
}
