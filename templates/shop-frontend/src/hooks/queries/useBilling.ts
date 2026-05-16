/**
 * Billing and Payment React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { GuestFolio, Payment, ApiResponse } from "@/types/api";

// ============================================
// FOLIOS
// ============================================

/**
 * Fetch guest folio by ID
 */
export function useFolio(id: string) {
  return useQuery({
    queryKey: queryKeys.folio(id),
    queryFn: async () => {
      const response = await get<ApiResponse<GuestFolio>>(`/billing/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

/**
 * Fetch folios for current guest
 */
export function useMyFolios() {
  return useQuery({
    queryKey: queryKeys.folios,
    queryFn: async () => {
      const response = await get<ApiResponse<GuestFolio>>("/billing/guests/live-bill");
      return response.data;
    },
    staleTime: 1000 * 60,
  });
}

// ============================================
// PAYMENTS
// ============================================

/**
 * Create payment mutation
 */
export function useCreatePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      folio_id: string;
      amount: number;
      method: "cash" | "card" | "mpesa" | "bank_transfer" | "points" | "paypal";
      reference?: string;
      points_redeemed?: number;
    }) => {
      const response = await post<ApiResponse<Payment>>("/payments", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.folio(variables.folio_id) });
      qc.invalidateQueries({ queryKey: queryKeys.folios });
    },
  });
}

/**
 * Mark folio as paid (Admin only)
 */
export function useMarkFolioAsPaid() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { folio_id: string; note?: string }) => {
      const response = await post<ApiResponse<any>>(`/billing/${data.folio_id}/mark-paid`, {
        note: data.note,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.folio(variables.folio_id) });
      qc.invalidateQueries({ queryKey: queryKeys.folios });
    },
  });
}

/**
 * Adjust folio balance (Admin only)
 */
export function useAdjustFolio() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      folio_id: string;
      amount: number;
      description: string;
      type: "discount" | "surcharge";
    }) => {
      const response = await post<ApiResponse<any>>(`/billing/${data.folio_id}/adjust`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.folio(variables.folio_id) });
      qc.invalidateQueries({ queryKey: queryKeys.folios });
    },
  });
}

/**
 * Process cash payment (Admin only)
 */
export function useCashPayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: { folio_id: string; amount: number; note?: string }) => {
      const response = await post<ApiResponse<any>>("/billing/payments/cash", data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.folio(variables.folio_id) });
      qc.invalidateQueries({ queryKey: queryKeys.folios });
    },
  });
}
