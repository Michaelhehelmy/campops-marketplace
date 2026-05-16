import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Gem, ShoppingCart, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface PointPackage {
  id: string;
  points: number;
  price_usd: number;
  label: string;
}

interface PackagesResponse {
  packages: PointPackage[];
  ratio: number;
}

export default function BuyPointsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<PointPackage | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PackagesResponse>({
    queryKey: ["loyalty-packages"],
    queryFn: () => get<PackagesResponse>("/loyalty/packages"),
    staleTime: 1000 * 60 * 5,
  });

  const buyMut = useMutation({
    mutationFn: (pkg: PointPackage) =>
      post<{ purchase_id: string; points: number; price_usd: number }>("/loyalty/buy", {
        points: pkg.points,
      }),
    onSuccess: (res) => {
      setPurchaseId(res.purchase_id);
      toast.success("Purchase initiated — complete payment below.");
    },
    onError: (e: any) => toast.error(e?.message || "Purchase failed"),
  });

  const simulateMut = useMutation({
    mutationFn: (pid: string) =>
      post<{ success: boolean; new_balance: number }>("/test/simulate-payment", {
        purchase_id: pid,
      }),
    onSuccess: (res) => {
      toast.success(`Payment confirmed! New balance: ${res.new_balance} Beats`);
      setPurchaseId(null);
      setSelected(null);
      qc.invalidateQueries({ queryKey: queryKeys.guestMe() });
      qc.invalidateQueries({ queryKey: queryKeys.loyaltyTransactions });
    },
    onError: (e: any) => toast.error(e?.message || "Simulation failed"),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Buy Beats</h1>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const packages = data?.packages ?? [];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="buy-points-heading">
        <Gem size={28} /> Buy Beats
      </h1>

      {!purchaseId ? (
        <>
          <p className="text-muted-foreground text-sm">
            Purchase Beats to use as discounts on your stay, dining, and more.
          </p>

          <div className="grid grid-cols-2 gap-4" data-testid="packages-grid">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`cursor-pointer transition-all border-2 ${
                  selected?.id === pkg.id
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground/30"
                }`}
                onClick={() => setSelected(pkg)}
                data-testid={`package-${pkg.id}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{pkg.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Gem className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">{pkg.points.toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">${pkg.price_usd}</p>
                  {selected?.id === pkg.id && (
                    <Badge variant="default" className="mt-1">
                      Selected
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            className="w-full"
            disabled={!selected || buyMut.isPending}
            onClick={() => selected && buyMut.mutate(selected)}
            data-testid="buy-btn"
          >
            <ShoppingCart size={16} className="mr-2" />
            {buyMut.isPending
              ? "Processing…"
              : selected
                ? `Buy ${selected.points.toLocaleString()} Beats for $${selected.price_usd}`
                : "Select a package"}
          </Button>
        </>
      ) : (
        <Card data-testid="payment-pending-card">
          <CardContent className="py-8 text-center space-y-6">
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <p className="font-semibold text-lg">Purchase initiated!</p>
              <p className="text-muted-foreground text-sm">
                Choose a payment method to complete your purchase of{" "}
                {selected?.points.toLocaleString()} Beats.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-left">
              <div className="border rounded-xl p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors border-primary bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg text-primary">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Credit / Debit Card</p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                  </div>
                </div>
                <div className="h-4 w-4 rounded-full border-4 border-primary" />
              </div>

              <div className="border rounded-xl p-4 flex items-center justify-between opacity-60 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2 rounded-lg">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">M-Pesa / Mobile Money</p>
                    <p className="text-xs text-muted-foreground">Direct mobile payment</p>
                  </div>
                </div>
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              </div>
            </div>

            <div className="space-y-4">
              <Button
                className="w-full"
                onClick={() => simulateMut.mutate(purchaseId!)}
                disabled={simulateMut.isPending}
                data-testid="complete-payment-btn"
              >
                {simulateMut.isPending ? "Processing Payment…" : `Pay $${selected?.price_usd} Now`}
              </Button>

              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] text-muted-foreground font-mono">REF: {purchaseId}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setPurchaseId(null);
                    setSelected(null);
                  }}
                >
                  Cancel and go back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
