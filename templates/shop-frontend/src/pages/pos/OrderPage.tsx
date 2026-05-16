/**
 * POS Order Page
 * Menu browsing and order creation with cart
 */

import { useState } from "react";
import { usePosItems, useCreateOrder } from "@/hooks/queries/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { POSItem } from "@/types/api";

interface CartItem {
  pos_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function OrderPage() {
  const { user } = useAuth();
  const { data: menuItems, isLoading } = usePosItems();
  const createOrder = useCreateOrder();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"dine_in" | "room_service" | "takeaway">("dine_in");

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const addToCart = (item: POSItem) => {
    if (!item.is_available) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.pos_item_id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.pos_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { pos_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    await createOrder.mutateAsync({
      guest_id: user?.guest_id,
      items: cart,
      type: orderType,
      notes: `Order with ${cart.length} items`,
    });
    setCart([]);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold" data-testid="pos-heading">
              Menu
            </h1>
            <div className="flex gap-2">
              {(["dine_in", "room_service", "takeaway"] as const).map((type) => (
                <Button
                  key={type}
                  variant={orderType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOrderType(type)}
                  data-testid={`order-type-${type}`}
                >
                  {type.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2" data-testid="menu-grid">
            {menuItems?.map((item) => {
              const isAvailable = item.is_available;
              return (
                <Card
                  key={item.id}
                  data-testid="menu-item"
                  className={
                    !isAvailable
                      ? "opacity-60 grayscale-[0.5] relative"
                      : "cursor-pointer hover:shadow-md transition-shadow duration-200"
                  }
                  onClick={() => isAvailable && addToCart(item)}
                >
                  <CardContent className="p-4">
                    {!isAvailable && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-destructive text-destructive-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Sold Out
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <div className="pr-4">
                        <h3 className="font-bold text-stone-800">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-stone-500 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-oasis shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-4" data-testid="cart-empty">
                  Your cart is empty
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.pos_item_id} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    data-testid="place-order-button"
                    onClick={handlePlaceOrder}
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? "Placing Order..." : "Place Order"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
