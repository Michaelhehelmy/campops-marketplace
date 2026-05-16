/**
 * Admin POS Items React Query hooks
 * Full CRUD + images + attributes + categories + stock
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del, api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PosItemImage {
  id: string;
  pos_item_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface PosItemAttribute {
  id: string;
  pos_item_id: string;
  attribute_name: string;
  attribute_value: string;
}

export interface PosCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string;
}

export interface AdminPosItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  category?: string;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  is_available: boolean;
  is_active: boolean;
  requires_preparation: boolean;
  preparation_time_minutes?: number;
  ingredients?: string[];
  allergens?: string[];
  nutrition_info?: Record<string, unknown>;
  stock_quantity: number;
  low_stock_threshold: number;
  barcode?: string;
  sku?: string;
  tax_rate?: number;
  images: PosItemImage[];
  attributes: PosItemAttribute[];
  created_at: string;
  updated_at: string;
}

export interface AdminPosItemInput {
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  category?: string;
  category_id?: string;
  image_url?: string;
  is_available?: boolean;
  is_active?: boolean;
  requires_preparation?: boolean;
  preparation_time_minutes?: number;
  ingredients?: string[];
  allergens?: string[];
  nutrition_info?: Record<string, unknown>;
  stock_quantity?: number;
  low_stock_threshold?: number;
  barcode?: string;
  sku?: string;
  tax_rate?: number;
  images?: Array<{ url: string; alt_text?: string }>;
  attributes?: Array<{ attribute_name: string; attribute_value: string }>;
}

// ─── POS Items Hooks ──────────────────────────────────────────────────────────

export function useAdminPosItems(filters?: {
  category_id?: string;
  is_active?: boolean;
  is_available?: boolean;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category_id) params.append("category_id", filters.category_id);
  if (filters?.is_active !== undefined) params.append("is_active", String(filters.is_active));

  if (filters?.is_available !== undefined) {
    if (filters.is_available === ("available" as any)) params.append("is_available", "true");
    else if (filters.is_available === ("unavailable" as any))
      params.append("is_available", "false");
    else params.append("is_available", String(filters.is_available));
  }

  if (filters?.search) params.append("search", filters.search);

  return useQuery({
    queryKey: [...queryKeys.posItems, "admin", filters ?? {}],
    queryFn: () => get<{ data: AdminPosItem[]; count: number }>(`/pos?${params}`),
    staleTime: 1_000,
  });
}

export function useAdminPosItem(id: string) {
  return useQuery({
    queryKey: [...queryKeys.posItems, id],
    queryFn: () => get<{ data: AdminPosItem }>(`/pos/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePosItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminPosItemInput) => post<{ data: AdminPosItem }>("/pos", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posItems });
    },
  });
}

export function useUpdatePosItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AdminPosItemInput> & { id: string }) =>
      put<{ data: AdminPosItem }>(`/pos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posItems });
    },
  });
}

export function useDeactivatePosItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/pos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posItems });
    },
  });
}

export function useUpdatePosItemStock(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stock_quantity,
      low_stock_threshold,
    }: {
      stock_quantity: number;
      low_stock_threshold?: number;
    }) =>
      api.patch(`/pos/${id}/stock`, { stock_quantity, low_stock_threshold }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.posItems });
    },
  });
}

// ─── POS Item Images ──────────────────────────────────────────────────────────

export function useAddPosItemImage(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; alt_text?: string; is_primary?: boolean }) =>
      post<{ data: PosItemImage }>(`/pos/${itemId}/images`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.posItems, itemId] }),
  });
}

export function useUploadPosItemImage(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, is_primary }: { file: File; is_primary?: boolean }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "dining");
      const mediaRes = await api.post<{ media: { url: string } }>("/media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = mediaRes.data.media?.url;
      if (!url) throw new Error("Upload returned no URL");
      return post<{ data: PosItemImage }>(`/pos/${itemId}/images`, { url, is_primary });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.posItems, itemId] }),
  });
}

export function useDeletePosItemImage(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imgId: string) => del(`/pos/${itemId}/images/${imgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.posItems, itemId] }),
  });
}

export function useReorderPosItemImages(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: Array<{ id: string; sort_order: number; is_primary?: boolean }>) =>
      put(`/pos/${itemId}/images/reorder`, { order }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.posItems, itemId] }),
  });
}

// ─── POS Item Attributes ──────────────────────────────────────────────────────

export function useAddPosItemAttribute(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { attribute_name: string; attribute_value: string }) =>
      post<{ data: PosItemAttribute }>(`/pos/${itemId}/attributes`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.posItems, itemId] }),
  });
}

export function useDeletePosItemAttribute(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attrId: string) => del(`/pos/${itemId}/attributes/${attrId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...queryKeys.posItems, itemId] }),
  });
}

// ─── POS Categories ───────────────────────────────────────────────────────────

export function usePosCategories(search?: string) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  return useQuery({
    queryKey: [...queryKeys.posCategories, search],
    queryFn: () => get<{ data: PosCategory[] }>(`/pos/categories/list?${params}`),
    staleTime: 1_000, // Reduced for admin
  });
}

export function useCreatePosCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PosCategory>) =>
      post<{ data: PosCategory }>("/pos/categories/list", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posCategories }),
  });
}

export function useUpdatePosCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PosCategory> & { id: string }) =>
      put<{ data: PosCategory }>(`/pos/categories/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posCategories }),
  });
}

export function useDeletePosCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/pos/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posCategories }),
  });
}
