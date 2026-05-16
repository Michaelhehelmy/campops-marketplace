import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { RatePlan } from "@/types/api";

export function useRatePlans() {
  return useQuery({
    queryKey: queryKeys.ratePlans,
    queryFn: () => get<{ data: RatePlan[] }>("/rate_plans"),
  });
}

export function useRatePlan(id: string | undefined) {
  return useQuery({
    queryKey: ["rate_plans", id],
    queryFn: () => get<{ data: RatePlan }>(`/rate_plans/${id}`),
    enabled: !!id,
  });
}

export function useCreateRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RatePlan>) => post<{ data: RatePlan }>("/rate_plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratePlans });
    },
  });
}

export function useUpdateRatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RatePlan>) => put<{ data: RatePlan }>(`/rate_plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratePlans });
      queryClient.invalidateQueries({ queryKey: ["rate_plans", id] });
    },
  });
}

export function useDeleteRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/rate_plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratePlans });
    },
  });
}
