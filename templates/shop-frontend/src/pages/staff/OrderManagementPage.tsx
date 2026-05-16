import { useOrders, useUpdateOrderStatus } from "@/hooks/queries/useOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSocketEvent } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { format } from "date-fns";
import { useState } from "react";
import toast from "react-hot-toast";

const statusColors: Record<string, "default" | "warning" | "success" | "secondary"> = {
  placed: "default",
  preparing: "warning",
  ready: "success",
  delivered: "secondary",
};

const nextStatus: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

export default function OrderManagementPage() {
  const [filter, setFilter] = useState<string>("");
  const { data, isLoading } = useOrders(filter ? { status: filter } : undefined);
  const updateStatus = useUpdateOrderStatus();
  const qc = useQueryClient();

  useSocketEvent("ORDER_CREATED", () => qc.invalidateQueries({ queryKey: queryKeys.orders }));
  useSocketEvent("ORDER_UPDATED", () => qc.invalidateQueries({ queryKey: queryKeys.orders }));

  const orders = data?.data || [];
  console.log("OrderManagementPage: data keys", data ? Object.keys(data) : "none");
  console.log("OrderManagementPage: orders count", orders.length);
  if (orders.length > 0) {
    console.log("OrderManagementPage: first order keys", Object.keys(orders[0]));
    console.log("OrderManagementPage: first order type", typeof orders[0].type, orders[0].type);
  }

  const handleAdvance = (id: string, currentStatus: string) => {
    const next = nextStatus[currentStatus];
    if (!next) return;
    updateStatus.mutate(
      { id, status: next as "placed" | "preparing" | "ready" | "delivered" },
      { onSuccess: () => toast.success(`Order moved to ${next}`) }
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" data-testid="order-management-heading">
        Order Management
      </h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["", "placed", "preparing", "ready", "delivered"].map((s) => (
          <Button
            key={s}
            data-testid={`filter-${s || "all"}`}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s || "All"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : !Array.isArray(orders) || orders.length === 0 ? (
        <p className="text-muted-foreground text-center py-8" data-testid="orders-empty">
          No orders found.
        </p>
      ) : (
        <div className="space-y-4" data-testid="orders-list">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">
                    Order #{String(order.id).slice(0, 8)}
                    {order.guest_name && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        — {String(order.guest_name)}
                      </span>
                    )}
                  </CardTitle>
                  <Badge variant={statusColors[order.status] || "default"}>
                    {String(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {String(order.type || "").replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.created_at ? format(new Date(order.created_at), "MMM d, HH:mm") : ""}
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {Array.isArray(order.items) ? order.items.length : 0} item
                      {Array.isArray(order.items) && order.items.length !== 1 ? "s" : ""} — $
                      {typeof order.total_amount === "number"
                        ? order.total_amount.toFixed(2)
                        : Number(order.total_amount || 0).toFixed(2)}
                    </p>
                  </div>
                  {nextStatus[order.status] && (
                    <Button
                      size="sm"
                      data-testid="advance-status-button"
                      onClick={() => handleAdvance(order.id, order.status)}
                      disabled={updateStatus.isPending}
                    >
                      → {nextStatus[order.status]}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
