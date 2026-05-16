/**
 * Room and Reservation React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Room, Reservation, ApiResponse, PaginatedResponse } from "@/types/api";

// ============================================
// ROOMS
// ============================================

/**
 * Fetch all rooms with optional filtering
 */
export function useRooms(filters?: { status?: string; type?: string; limit?: number }) {
  const queryString = new URLSearchParams();
  if (filters?.status) queryString.append("status", filters.status);
  if (filters?.type) queryString.append("type", filters.type);
  if (filters?.limit) queryString.append("limit", String(filters.limit));
  else queryString.append("limit", "200"); // Increase default for Staff/Manager use

  return useQuery({
    queryKey: [...queryKeys.rooms, filters || {}],
    queryFn: async () => {
      const url = `/rooms${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<PaginatedResponse<Room>>(url);
      return response;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Fetch single room by ID
 */
export function useRoom(id: string) {
  return useQuery({
    queryKey: queryKeys.room(id),
    queryFn: async () => {
      const response = await get<ApiResponse<Room>>(`/rooms/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

// ============================================
// RESERVATIONS
// ============================================

/**
 * Fetch all reservations
 */
export function useReservations(options?: {
  status?: string;
  guest_id?: string;
  limit?: number;
  offset?: number;
}) {
  const queryString = new URLSearchParams();
  if (options?.status) queryString.append("status", options.status);
  if (options?.guest_id) queryString.append("guest_id", options.guest_id);
  if (options?.limit) queryString.append("limit", String(options.limit));
  if (options?.offset) queryString.append("offset", String(options.offset));

  return useQuery({
    queryKey: [...queryKeys.reservations, options || {}],
    queryFn: async () => {
      const url = `/reservations${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<PaginatedResponse<Reservation>>(url);
      return response;
    },
    staleTime: 1000 * 30,
  });
}

/**
 * Create reservation mutation
 */
export function useCreateReservation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Reservation>) => {
      const response = await post<ApiResponse<Reservation>>("/reservations", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reservations });
      qc.invalidateQueries({ queryKey: queryKeys.rooms });
    },
  });
}

/**
 * Check-in mutation
 */
export function useCheckIn() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await patch<ApiResponse<Reservation>>(`/reservations/${reservationId}`, {
        status: "checked_in",
      });
      return response.data;
    },
    onSuccess: (_, reservationId) => {
      qc.invalidateQueries({ queryKey: queryKeys.reservation(reservationId) });
      qc.invalidateQueries({ queryKey: queryKeys.reservations });
      qc.invalidateQueries({ queryKey: queryKeys.rooms });
    },
  });
}

/**
 * Check-out mutation
 */
export function useCheckOut() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await patch<ApiResponse<Reservation>>(`/reservations/${reservationId}`, {
        status: "checked_out",
      });
      return response.data;
    },
    onSuccess: (_, reservationId) => {
      qc.invalidateQueries({ queryKey: queryKeys.reservation(reservationId) });
      qc.invalidateQueries({ queryKey: queryKeys.reservations });
      qc.invalidateQueries({ queryKey: queryKeys.rooms });
    },
  });
}
