import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MiningSession } from "@/types/api";
import { Pickaxe, Play, Square, Gem } from "lucide-react";
import toast from "react-hot-toast";

export default function MiningPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.miningSession,
    queryFn: () => get<{ data: MiningSession | null }>("/loyalty/mining"),
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
  });

  const session = data?.data;

  const startMining = useMutation({
    mutationFn: () => post("/loyalty/mining/start"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.miningSession });
      toast.success("Mining started!");
    },
    onError: () => toast.error("Failed to start mining"),
  });

  const stopMining = useMutation({
    mutationFn: () =>
      session?.id
        ? post("/loyalty/mining/stop", { sessionId: session.id })
        : post("/loyalty/mining/stop/auto"),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: queryKeys.miningSession });
      qc.invalidateQueries({ queryKey: queryKeys.loyaltyTransactions });
      qc.invalidateQueries({ queryKey: queryKeys.guestMe() });
      toast.success(res?.message || "Mining stopped. Points credited!");
    },
    onError: () => toast.error("Failed to stop mining"),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Mining</h1>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" data-testid="mining-heading">
        Mining
      </h1>

      <Card className="mb-8">
        <CardContent className="py-10 text-center">
          <Pickaxe
            className={`h-16 w-16 mx-auto mb-4 ${session?.status === "active" ? "text-primary animate-bounce" : "text-muted-foreground"}`}
          />

          {session?.status === "active" ? (
            <>
              <Badge variant="success" className="mb-3">
                Mining Active
              </Badge>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Gem className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold" data-testid="beats-earned">
                  {session.beats_earned ?? session.points_earned ?? 0}
                </span>
                <span className="text-muted-foreground">Beats earned</span>
              </div>
              {session.elapsed_hours != null && (
                <p className="text-xs text-muted-foreground mb-3" data-testid="elapsed-hours">
                  {(session.elapsed_hours * 60).toFixed(1)} min elapsed
                </p>
              )}
              <Button
                variant="destructive"
                size="lg"
                onClick={() => stopMining.mutate()}
                disabled={stopMining.isPending}
                data-testid="stop-mining-btn"
              >
                <Square size={18} className="mr-2" /> Stop Mining
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                Start mining to earn Beats points while you stay!
              </p>
              <Button
                size="lg"
                onClick={() => startMining.mutate()}
                disabled={startMining.isPending}
                data-testid="start-mining-btn"
              >
                <Play size={18} className="mr-2" /> Start Mining
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Mining Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Start a mining session to passively earn Beats loyalty points.</p>
          <p>Points accumulate every hour while your session is active.</p>
          <p>Stop mining to collect your points — they'll be added to your balance instantly.</p>
          <p>Redeem Beats for room upgrades, dining credits, and more!</p>
        </CardContent>
      </Card>
    </div>
  );
}
