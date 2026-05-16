import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { MediaItem } from "@/types/api";

export interface Gallery {
  id: string;
  name: string;
  description: string;
  items: (MediaItem & { sort_order: number })[];
}

/**
 * Fetch all public galleries with their items
 */
export function useGalleries() {
  return useQuery({
    queryKey: [...queryKeys.media, "galleries"],
    queryFn: async () => {
      const response = await get<Gallery[]>("/galleries");
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 mins
  });
}
