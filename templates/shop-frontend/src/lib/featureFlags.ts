import { useQuery } from "@tanstack/react-query";
import { get } from "./api";

export interface FeatureFlag {
  name: string;
  is_enabled: boolean;
  description: string;
}

/**
 * Fetches all feature flags from the server.
 * Cached for 60 seconds; stale-while-revalidate pattern via React Query.
 */
export function useFeatureFlags() {
  return useQuery<FeatureFlag[]>({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const data = await get<{ flags: FeatureFlag[] }>("/feature-flags");
      return data.flags;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Returns whether a single named flag is enabled.
 * Returns false (safe default) while loading or on error.
 */
export function useFlag(name: string): boolean {
  const { data } = useFeatureFlags();
  return data?.find((f) => f.name === name)?.is_enabled ?? false;
}
