/**
 * Page Builder (CMS) React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { CustomPage, PageListResponse, ApiResponse } from "@/types/api";

/**
 * Fetch all pages with pagination
 */
export function usePages(options?: { status?: "draft" | "published"; limit?: number }) {
  const queryString = new URLSearchParams();
  if (options?.status) queryString.append("status", options.status);
  if (options?.limit) queryString.append("limit", String(options.limit));

  return useQuery({
    queryKey: [...queryKeys.pages, options || {}],
    queryFn: async () => {
      const url = `/pages${queryString.toString() ? `?${queryString.toString()}` : ""}`;
      const response = await get<PageListResponse>(url);
      return response;
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (default)
    refetchOnMount: "always",
  });
}

/**
 * Fetch single page by ID
 */
export function usePage(id: string) {
  return useQuery({
    queryKey: queryKeys.page(id),
    queryFn: async () => {
      const response = await get<ApiResponse<CustomPage>>(`/pages/${id}`);
      return response.data;
    },
    enabled: !!id && id !== "new",
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch public page by slug (no auth required)
 */
export function usePublicPage(slug: string) {
  return useQuery({
    queryKey: queryKeys.pageBySlug(slug),
    queryFn: async () => {
      const response = await get<CustomPage>(`/public/page/${slug}`);
      return response;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create page mutation
 */
export function useCreatePage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CustomPage>) => {
      const response = await post<ApiResponse<CustomPage>>("/pages", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages });
    },
  });
}

/**
 * Update page mutation
 */
export function useUpdatePage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomPage> }) => {
      const response = await put<ApiResponse<CustomPage>>(`/pages/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.page(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.pages });
    },
  });
}

/**
 * Delete page mutation
 */
export function useDeletePage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/pages/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pages });
    },
  });
}

/**
 * Publish page mutation
 */
export function usePublishPage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await post<ApiResponse<CustomPage>>(`/pages/${id}/publish`, {});
      return response.data;
    },
    onSuccess: (data: any) => {
      const pageId = data?.id || data?.data?.id;
      if (pageId) qc.invalidateQueries({ queryKey: queryKeys.page(pageId) });
      qc.invalidateQueries({ queryKey: queryKeys.pages });
    },
  });
}
