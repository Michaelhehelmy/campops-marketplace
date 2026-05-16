/**
 * Admin Rooms React Query hooks
 * Full CRUD + images + seasonal pricing
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del, api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomImage {
  id: string;
  room_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface SeasonalPrice {
  id: string;
  room_id: string;
  label?: string;
  start_date: string;
  end_date: string;
  price_override?: number;
  price_multiplier?: number;
}

export interface AdminRoom {
  id: string;
  name: string;
  type: string;
  description?: string;
  base_price: number;
  capacity: number;
  max_occupancy?: number;
  size_sqm?: number;
  bed_type?: string;
  view_type?: string;
  floor?: string;
  status: string;
  amenities: string[];
  notes?: string;
  rate_plan_id?: string;
  rate_plan_name?: string;
  thumbnail_url?: string;
  image_url?: string;
  is_active: boolean;
  images: RoomImage[];
  seasonal_pricing: SeasonalPrice[];
  created_at: string;
  updated_at: string;
}

export interface AdminRoomInput {
  name: string;
  type?: string;
  description?: string;
  base_price?: number;
  capacity?: number;
  max_occupancy?: number;
  size_sqm?: number;
  bed_type?: string;
  view_type?: string;
  floor?: string;
  status?: string;
  amenities?: string[];
  notes?: string;
  rate_plan_id?: string;
  thumbnail_url?: string;
  is_active?: boolean;
  images?: Array<{ url: string; alt_text?: string }>;
  seasonal_pricing?: Array<{
    label?: string;
    start_date: string;
    end_date: string;
    price_override?: number;
    price_multiplier?: number;
  }>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminRooms(filters?: {
  status?: string;
  type?: string;
  is_active?: boolean;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.type) params.append("type", filters.type);
  if (filters?.is_active !== undefined) params.append("is_active", String(filters.is_active));
  if (filters?.search) params.append("search", filters.search);

  return useQuery({
    queryKey: [...queryKeys.adminRooms, filters ?? {}],
    queryFn: () => get<{ data: AdminRoom[]; count: number }>(`/rooms?${params}`),
    staleTime: 30_000,
  });
}

export function useAdminRoom(id: string) {
  return useQuery({
    queryKey: queryKeys.adminRoom(id),
    queryFn: () => get<{ data: AdminRoom }>(`/rooms/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminRoomInput) => post<{ data: AdminRoom }>("/rooms", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminRooms });
      qc.invalidateQueries({ queryKey: queryKeys.rooms });
    },
  });
}

export function useUpdateRoom(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminRoomInput>) => put<{ data: AdminRoom }>(`/rooms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminRoom(id) });
      qc.invalidateQueries({ queryKey: queryKeys.adminRooms });
      qc.invalidateQueries({ queryKey: queryKeys.rooms });
    },
  });
}

export function useDeactivateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/rooms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminRooms });
      qc.invalidateQueries({ queryKey: queryKeys.rooms });
    },
  });
}

// ─── Room Images ──────────────────────────────────────────────────────────────

export function useAddRoomImage(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; alt_text?: string; is_primary?: boolean }) =>
      post<{ data: RoomImage }>(`/rooms/${roomId}/images`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminRoom(roomId) }),
  });
}

export function useUploadRoomImage(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, is_primary }: { file: File; is_primary?: boolean }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "rooms");
      const mediaRes = await api.post<{ media: { url: string } }>("/media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = mediaRes.data.media?.url;
      if (!url) throw new Error("Upload returned no URL");
      return post<{ data: RoomImage }>(`/rooms/${roomId}/images`, { url, is_primary });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminRoom(roomId) }),
  });
}

export function useDeleteRoomImage(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imgId: string) => del(`/rooms/${roomId}/images/${imgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminRoom(roomId) }),
  });
}

export function useReorderRoomImages(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: Array<{ id: string; sort_order: number; is_primary?: boolean }>) =>
      put(`/rooms/${roomId}/images/reorder`, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminRoom(roomId) }),
  });
}

// ─── Seasonal Pricing ─────────────────────────────────────────────────────────

export function useAddSeasonalPrice(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      label?: string;
      start_date: string;
      end_date: string;
      price_override?: number;
      price_multiplier?: number;
    }) => post<{ data: SeasonalPrice }>(`/rooms/${roomId}/seasonal`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminRoom(roomId) }),
  });
}

export function useDeleteSeasonalPrice(roomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sid: string) => del(`/rooms/${roomId}/seasonal/${sid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminRoom(roomId) }),
  });
}
