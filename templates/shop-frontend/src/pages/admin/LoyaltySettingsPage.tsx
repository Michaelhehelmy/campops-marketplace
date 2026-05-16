import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { get, patch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/switch";
import { Gem, Settings, Pickaxe, Gift, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";

interface LoyaltySettings {
  loyalty_mining_base_rate: number;
  loyalty_points_exchange_rate: number;
  loyalty_mining_enabled: boolean;
  loyalty_mining_max_hours_per_day: number;
  loyalty_mining_monthly_budget: number;
  loyalty_mining_liability_cap_pct: number;
  loyalty_premium_mining_multiplier: number;
  referral_new_user_points: number;
  referral_referrer_points: number;
  referral_reward_both: boolean;
  points_purchase_ratio: number;
  loyalty_points_name: string;
}

export default function LoyaltySettingsPage() {
  const qc = useQueryClient();

  const { data: remote, isLoading } = useQuery<LoyaltySettings>({
    queryKey: ["loyalty-settings-admin"],
    queryFn: () => get<LoyaltySettings>("/loyalty/settings"),
    staleTime: 0,
  });

  const [form, setForm] = useState<Partial<LoyaltySettings>>({});
  useEffect(() => {
    if (remote) setForm(remote);
  }, [remote]);

  const saveMut = useMutation({
    mutationFn: (updates: Partial<LoyaltySettings>) => patch("/loyalty/settings", updates),
    onSuccess: () => {
      toast.success("Loyalty settings saved");
      qc.invalidateQueries({ queryKey: ["loyalty-settings-admin"] });
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  function num(key: keyof LoyaltySettings) {
    return Number((form as any)[key] ?? 0);
  }
  function setNum(key: keyof LoyaltySettings, val: string) {
    setForm((f) => ({ ...f, [key]: val === "" ? "" : Number(val) }));
  }
  function setBool(key: keyof LoyaltySettings, val: boolean) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  if (isLoading) return <p className="p-8">Loading settings…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1
        className="text-3xl font-bold flex items-center gap-2"
        data-testid="loyalty-settings-heading"
      >
        <Settings size={28} /> Loyalty Settings
      </h1>

      {/* Mining */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pickaxe size={16} /> Mining
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mining-enabled">Mining enabled</Label>
            <Switch
              id="mining-enabled"
              checked={!!form.loyalty_mining_enabled}
              onCheckedChange={(v: boolean) => setBool("loyalty_mining_enabled", v)}
              data-testid="mining-enabled-toggle"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mining-rate">Base rate (Beats/hour)</Label>
            <Input
              id="mining-rate"
              type="number"
              min="1"
              value={num("loyalty_mining_base_rate")}
              onChange={(e) => setNum("loyalty_mining_base_rate", e.target.value)}
              data-testid="mining-rate-input"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mining-max-hours">Max hours/day per guest</Label>
            <Input
              id="mining-max-hours"
              type="number"
              min="1"
              max="24"
              value={num("loyalty_mining_max_hours_per_day")}
              onChange={(e) => setNum("loyalty_mining_max_hours_per_day", e.target.value)}
              data-testid="mining-max-hours-input"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mining-budget">Monthly budget (total Beats)</Label>
            <Input
              id="mining-budget"
              type="number"
              min="0"
              value={num("loyalty_mining_monthly_budget")}
              onChange={(e) => setNum("loyalty_mining_monthly_budget", e.target.value)}
              data-testid="mining-budget-input"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="premium-mult">Premium tier multiplier</Label>
            <Input
              id="premium-mult"
              type="number"
              min="1"
              step="0.5"
              value={num("loyalty_premium_mining_multiplier")}
              onChange={(e) => setNum("loyalty_premium_mining_multiplier", e.target.value)}
              data-testid="premium-mult-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Redemption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gem size={16} /> Redemption ratio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="exchange-rate">
              Points per $1 discount (e.g. 100 = 100 Beats = $1 off)
            </Label>
            <Input
              id="exchange-rate"
              type="number"
              min="1"
              value={num("loyalty_points_exchange_rate")}
              onChange={(e) => setNum("loyalty_points_exchange_rate", e.target.value)}
              data-testid="exchange-rate-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Referral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift size={16} /> Referral rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ref-new-user">New user signup bonus (Beats)</Label>
            <Input
              id="ref-new-user"
              type="number"
              min="0"
              value={num("referral_new_user_points")}
              onChange={(e) => setNum("referral_new_user_points", e.target.value)}
              data-testid="ref-new-user-input"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ref-referrer">Referrer reward (Beats)</Label>
            <Input
              id="ref-referrer"
              type="number"
              min="0"
              value={num("referral_referrer_points")}
              onChange={(e) => setNum("referral_referrer_points", e.target.value)}
              data-testid="ref-referrer-input"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ref-both">Reward both new user AND referrer</Label>
            <Switch
              id="ref-both"
              checked={!!form.referral_reward_both}
              onCheckedChange={(v: boolean) => setBool("referral_reward_both", v)}
              data-testid="ref-both-toggle"
            />
          </div>
        </CardContent>
      </Card>

      {/* Purchase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart size={16} /> Points purchase ratio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="purchase-ratio">
              Beats per $1 purchased (e.g. 50 = $1 buys 50 Beats)
            </Label>
            <Input
              id="purchase-ratio"
              type="number"
              min="1"
              value={num("points_purchase_ratio")}
              onChange={(e) => setNum("points_purchase_ratio", e.target.value)}
              data-testid="purchase-ratio-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gem size={16} /> Points Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="points-name">Points Name (plural)</Label>
            <Input
              id="points-name"
              value={form.loyalty_points_name || ""}
              onChange={(e) => setForm((f) => ({ ...f, loyalty_points_name: e.target.value }))}
              data-testid="loyalty-points-name"
              placeholder="Beats, Points, Credits..."
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={() => saveMut.mutate(form as LoyaltySettings)}
        disabled={saveMut.isPending}
        data-testid="save-loyalty-settings-btn"
      >
        {saveMut.isPending ? "Saving…" : "Save all settings"}
      </Button>
    </div>
  );
}
