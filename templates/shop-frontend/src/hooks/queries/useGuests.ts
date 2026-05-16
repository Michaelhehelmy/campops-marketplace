/**
 * Guest React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, patch } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Guest, ApiResponse, PaginatedResponse } from "@/types/api";

import toast from "react-hot-toast";

/**
 * Fetch current user's guest profile
 */
export function useMyProfile() {
  return useQuery({
    queryKey: queryKeys.guestMe(),
    queryFn: async () => {
      const response = await get<ApiResponse<Guest>>("/guests/me");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch all guests (admin/manager only)
 */
export function useGuests() {
  return useQuery({
    queryKey: queryKeys.guests,
    queryFn: async () => {
      const response = await get<PaginatedResponse<Guest>>("/guests");
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Fetch single guest by ID
 */
export function useGuest(id: string) {
  return useQuery({
    queryKey: queryKeys.guest(id),
    queryFn: async () => {
      const response = await get<ApiResponse<Guest>>(`/guests/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Update guest profile mutation
 */
export function useUpdateGuest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Guest> }) => {
      const response = await put<ApiResponse<Guest>>(`/guests/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.guest(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.guestMe() });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update profile");
    },
  });
}
/**
 * Update current guest profile mutation
 */
export function useUpdateMyProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Guest>) => {
      const response = await patch<ApiResponse<Guest>>("/guests/me", data);
      return response.data;
    },
    onSuccess: () => {
      console.log("[FRONTEND] Profile update success - calling toast");
      qc.invalidateQueries({ queryKey: queryKeys.guestMe() });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      console.error("[FRONTEND] Profile update error:", error);
      toast.error(error.response?.data?.error || "Failed to update profile");
    },
  });
}
