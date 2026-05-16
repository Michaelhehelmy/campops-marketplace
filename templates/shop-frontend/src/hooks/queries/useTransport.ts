/**
 * Transportation React Query hooks
 * Vehicles, Drivers, and Transfers/Bookings
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Vehicle, Driver, Transfer, ApiResponse } from "@/types/api";

// ============================================
// VEHICLES
// ============================================

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.transport.vehicles,
    queryFn: async () => {
      const response = await get<{ data: Vehicle[] }>("/transport/vehicles");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Vehicle, "id" | "created_at" | "updated_at">) => {
      const response = await post<ApiResponse<Vehicle>>("/transport/vehicles", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.vehicles });
    },
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Vehicle, "id" | "created_at" | "updated_at">>;
    }) => {
      const response = await put<ApiResponse<Vehicle>>(`/transport/vehicles/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.vehicles });
      qc.invalidateQueries({ queryKey: queryKeys.transport.vehicle(variables.id) });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/transport/vehicles/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.vehicles });
    },
  });
}

// ============================================
// DRIVERS
// ============================================

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.transport.drivers,
    queryFn: async () => {
      const response = await get<{ data: Driver[] }>("/transport/drivers");
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<Driver, "id" | "created_at" | "updated_at" | "full_name" | "email"> & {
        full_name?: string;
      }
    ) => {
      const response = await post<ApiResponse<Driver>>("/transport/drivers", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.drivers });
    },
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Driver, "id" | "created_at" | "updated_at" | "full_name" | "email">>;
    }) => {
      const response = await put<ApiResponse<Driver>>(`/transport/drivers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.drivers });
      qc.invalidateQueries({ queryKey: queryKeys.transport.driver(variables.id) });
    },
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/transport/drivers/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.drivers });
    },
  });
}

// ============================================
// TRANSFERS
// ============================================

export function useTransfers(options?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  const queryString = new URLSearchParams();
  if (options?.status) queryString.append("status", options.status);
  if (options?.date_from) queryString.append("date_from", options.date_from);
  if (options?.date_to) queryString.append("date_to", options.date_to);
  if (options?.page) queryString.append("page", String(options.page));
  if (options?.limit) queryString.append("limit", String(options.limit));

  return useQuery({
    queryKey: [...queryKeys.transport.transfers, options || {}],
    queryFn: async () => {
      const url = `/transport/transfers${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<{ data: Transfer[]; page: number; limit: number }>(url);
      return response;
    },
    staleTime: 1000 * 30,
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Omit<
        Transfer,
        | "id"
        | "created_at"
        | "updated_at"
        | "driver_name"
        | "vehicle_make"
        | "vehicle_model"
        | "license_plate"
      >
    ) => {
      const response = await post<ApiResponse<Transfer>>("/transport/transfers", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.transfers });
    },
  });
}

export function useUpdateTransfer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Transfer, "id" | "created_at" | "updated_at">>;
    }) => {
      const response = await put<ApiResponse<Transfer>>(`/transport/transfers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.transfers });
      qc.invalidateQueries({ queryKey: queryKeys.transport.transfer(variables.id) });
    },
  });
}

export function useUpdateTransferStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      dropoff_datetime,
    }: {
      id: string;
      status: Transfer["status"];
      dropoff_datetime?: string;
    }) => {
      const response = await put<ApiResponse<Transfer>>(`/transport/transfers/${id}/status`, {
        status,
        dropoff_datetime,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.transfers });
      qc.invalidateQueries({ queryKey: queryKeys.transport.transfer(variables.id) });
    },
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/transport/transfers/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transport.transfers });
    },
  });
}
