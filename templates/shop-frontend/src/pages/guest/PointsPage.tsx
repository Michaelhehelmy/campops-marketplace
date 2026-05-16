import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import type { LoyaltyTransaction, Guest } from "@/types/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Gem, TrendingUp, TrendingDown, Gift, Minus, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";

export default function PointsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [redeemAmount, setRedeemAmount] = useState("");

  const redeemMut = useMutation({
    mutationFn: (pts: number) => post("/loyalty/redeem", { points: pts }),
    onSuccess: (res: any) => {
      toast.success(`Redeemed ${redeemMut.variables} Beats! New balance: ${res.new_balance}`);
      setRedeemAmount("");
      qc.invalidateQueries({ queryKey: queryKeys.guestMe() });
      qc.invalidateQueries({ queryKey: queryKeys.loyaltyTransactions });
    },
    onError: (err: any) => toast.error(err?.message || "Redemption failed"),
  });

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    const pts = Number(redeemAmount);
    if (!pts || pts <= 0) {
      toast.error("Enter a valid number of Beats");
      return;
    }
    redeemMut.mutate(pts);
  }

  const { data: profile } = useQuery({
    queryKey: queryKeys.guestMe(),
    queryFn: () => get<{ data: Guest }>("/guests/me").then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.loyaltyTransactions,
    queryFn: () => get<{ data: LoyaltyTransaction[] }>("/loyalty/transactions"),
    staleTime: 1000 * 60,
  });

  const transactions = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="points-heading">
          Points
        </h1>
        <Button
          variant="outline"
          onClick={() => navigate("/guest/buy-points")}
          data-testid="buy-points-btn"
        >
          <ShoppingCart size={16} className="mr-2" /> Buy Beats
        </Button>
      </div>

      <Card className="mb-8">
        <CardContent className="py-8 text-center">
          <Gem className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p className="text-4xl font-bold" data-testid="points-balance">
            {profile?.loyalty_points ?? 0}
          </p>
          <p className="text-sm text-muted-foreground">Beats</p>
          <div className="mt-4 pt-4 border-t border-border/50">
            <Badge variant="secondary" className="px-3 py-1">
              {profile?.tier || "Standard"} Tier
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8" data-testid="redeem-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Minus size={18} /> Redeem Beats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRedeem} className="flex gap-3 items-end" data-testid="redeem-form">
            <div className="flex-1 space-y-1">
              <Label htmlFor="redeem-amount">Beats to redeem</Label>
              <Input
                id="redeem-amount"
                type="number"
                min="1"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder={`Max ${profile?.loyalty_points ?? 0}`}
                data-testid="redeem-amount-input"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={redeemMut.isPending || !redeemAmount}
              data-testid="redeem-btn"
            >
              {redeemMut.isPending ? "Redeeming..." : "Redeem"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4" data-testid="tx-history-heading">
        Transaction History
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8" data-testid="no-transactions">
          No transactions yet.
        </p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {t.type === "earned" && <TrendingUp size={18} className="text-green-600" />}
                  {t.type === "redeemed" && <TrendingDown size={18} className="text-red-600" />}
                  {t.type === "mined" && <Gem size={18} className="text-primary" />}
                  {t.type === "bonus" && <Gift size={18} className="text-yellow-600" />}
                  <div>
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${t.points > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {t.points > 0 ? "+" : ""}
                  {t.points}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
