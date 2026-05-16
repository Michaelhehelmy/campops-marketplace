import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSocketEvent } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import type { InventoryItem, PaginatedResponse } from "@/types/api";
import { Package, AlertTriangle } from "lucide-react";

function stockStatus(item: InventoryItem): "normal" | "warning" | "critical" {
  if (item.current_stock <= 0) return "critical";
  if (item.current_stock <= item.reorder_point) return "warning";
  return "normal";
}

const statusBadge: Record<string, "success" | "warning" | "destructive"> = {
  normal: "success",
  warning: "warning",
  critical: "destructive",
};

export default function InventoryViewerPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.inventory,
    queryFn: () => get<PaginatedResponse<InventoryItem>>("/inventory"),
    staleTime: 1000 * 30,
  });

  useSocketEvent("LOW_STOCK_ALERT", () => qc.invalidateQueries({ queryKey: queryKeys.inventory }));

  const items = data?.data ?? [];
  const lowStock = items.filter((i) => stockStatus(i) !== "normal");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Inventory</h1>

      {lowStock.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-800 dark:text-red-200">
            {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} below reorder level
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No inventory items found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Stock</th>
                <th className="text-right p-3 font-medium">Par Level</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = stockStatus(item);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{item.category}</td>
                    <td className="p-3 text-right">
                      {item.current_stock} {item.unit}
                    </td>
                    <td className="p-3 text-right">
                      {item.par_level} {item.unit}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={statusBadge[status]}>{status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
