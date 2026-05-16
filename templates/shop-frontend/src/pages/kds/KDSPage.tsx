/**
 * Kitchen Display System (KDS) Page
 * Full-screen, auto-refreshing order display for kitchen staff
 */

import React, { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useKitchenOrders, useUpdateOrderStatus } from "@/hooks/queries/useOrders";
import { useSocketEvent } from "@/hooks/useSocket";
import { useNotifications, useRequestNotificationsOnMount } from "@/hooks/useNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/use-toast";
import { ChefHat, Clock, Volume2, VolumeX, CheckCircle2, Utensils, Bell } from "lucide-react";
import type { Order } from "@/types/api";
import { cn, formatCurrency } from "@/lib/utils";

// Sound notification hook
function useOrderNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => {
    // Simple beep using Web Audio API
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA=="
    );
  }, []);

  const play = useCallback(() => {
    if (enabledRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  return { play, toggle, enabled: () => enabledRef.current };
}

// Browser notification button component
function NotificationButton() {
  const { isSupported, permission, requestPermission } = useNotifications();

  if (!isSupported) return null;

  if (permission === "granted") {
    return (
      <Badge variant="outline" className="gap-1">
        <Bell className="h-3 w-3" />
        Notifications On
      </Badge>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={requestPermission} className="gap-2">
      <Bell className="h-4 w-4" />
      Enable Notifications
    </Button>
  );
}

// Order card component - memoized for performance
const OrderCard = React.memo(function OrderCard({
  order,
  onStatusChange,
  isUpdating,
}: {
  order: Order;
  onStatusChange: (id: string, status: "placed" | "preparing" | "ready" | "delivered") => void;
  isUpdating: boolean;
}) {
  const elapsedTime = useMemo(() => {
    const created = new Date(order.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
    return diff;
  }, [order.created_at]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "placed":
        return "bg-yellow-500";
      case "preparing":
        return "bg-blue-500";
      case "ready":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card
      data-testid="order-card"
      className={cn(
        "card h-full transition-all duration-300",
        order.status === "ready" && "ring-2 ring-green-500",
        elapsedTime > 30 && "border-red-500"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">#{order.id.slice(-4)}</CardTitle>
          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{elapsedTime}m elapsed</span>
          {elapsedTime > 30 && <span className="text-red-500 font-bold">OVERDUE</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start">
              <div>
                <span className="font-medium">{item.quantity}x</span> <span>{item.name}</span>
                {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="font-bold">{formatCurrency(order.total_amount)}</span>
          <div className="flex gap-2">
            {order.status === "placed" && (
              <Button
                size="sm"
                data-testid="start-cooking-button"
                onClick={() => onStatusChange(order.id, "preparing")}
                disabled={isUpdating}
              >
                Start Cooking
              </Button>
            )}
            {order.status === "preparing" && (
              <Button
                size="sm"
                variant="default"
                data-testid="mark-ready-button"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onStatusChange(order.id, "ready")}
                disabled={isUpdating}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Ready
              </Button>
            )}
            {order.status === "ready" && (
              <Button
                size="sm"
                variant="outline"
                data-testid="complete-order-button"
                onClick={() => onStatusChange(order.id, "delivered")}
                disabled={isUpdating}
              >
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Main KDS Page
export default function KDSPage() {
  const { data: orders = [], isLoading, refetch } = useKitchenOrders();
  const updateStatus = useUpdateOrderStatus();
  const { play, toggle } = useOrderNotification();
  const { showOrderReadyNotification } = useNotifications();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Request notification permission on mount
  useRequestNotificationsOnMount(true);

  // WebSocket real-time updates
  useSocketEvent("ORDER_CREATED", (order: Order) => {
    // Play notification for new orders
    play();
    // Browser notification for new orders
    showOrderReadyNotification(order.id, (order as any).table_number);
    toast({
      title: "New Order Received",
      description: `Order #${order.id.slice(-4)} - ${order.items?.length || 0} items`,
    });
    refetch();
  });

  useSocketEvent("ORDER_UPDATED", () => {
    refetch();
  });

  // Auto-refresh fallback (5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleStatusChange = useCallback(
    (id: string, status: "placed" | "preparing" | "ready" | "delivered") => {
      updateStatus.mutate({ id, status });
    },
    [updateStatus]
  );

  const handleToggleSound = useCallback(() => {
    const newState = toggle();
    setSoundEnabled(newState);
    toast({
      title: newState ? "Sound Enabled" : "Sound Disabled",
    });
  }, [toggle]);

  // Group orders by status
  const groupedOrders = useMemo(() => {
    return {
      placed: orders.filter((o: Order) => o.status === "placed"),
      preparing: orders.filter((o: Order) => o.status === "preparing"),
      ready: orders.filter((o: Order) => o.status === "ready"),
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="h-screen p-4 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="kds-heading">
            Kitchen Display System
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationButton />
          <Button variant="ghost" size="sm" onClick={handleToggleSound} className="gap-2">
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Sound {soundEnabled ? "On" : "Off"}
          </Button>
          <Badge variant="outline" className="text-sm">
            <Utensils className="h-3 w-3 mr-1" />
            {orders.length} Active Orders
          </Badge>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 p-4 grid grid-cols-3 gap-4 overflow-hidden" data-testid="order-queue">
        {/* New Orders Column */}
        <div className="flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-yellow-500">{groupedOrders.placed.length}</Badge>
            New Orders
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {groupedOrders.placed.map((order: Order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
              />
            ))}
            {groupedOrders.placed.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No new orders</div>
            )}
          </div>
        </div>

        {/* Preparing Column */}
        <div className="flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-blue-500">{groupedOrders.preparing.length}</Badge>
            In Progress
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {groupedOrders.preparing.map((order: Order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
              />
            ))}
            {groupedOrders.preparing.length === 0 && (
              <div className="text-center text-muted-foreground py-8">Nothing cooking</div>
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-green-500">{groupedOrders.ready.length}</Badge>
            Ready for Pickup
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {groupedOrders.ready.map((order: Order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
              />
            ))}
            {groupedOrders.ready.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No orders ready</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
