import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MenuResponse } from "@/types/api";

export function useMenu(name: string = "main") {
  return useQuery({
    queryKey: ["menu", name],
    queryFn: async () => {
      const { data } = await axios.get<MenuResponse>(`/api/menus/${name}`, {
        timeout: 2000, // 2 second timeout for navigation - must be fast
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on failure to avoid blocking page load
    gcTime: 10 * 60 * 1000,
  });
}
