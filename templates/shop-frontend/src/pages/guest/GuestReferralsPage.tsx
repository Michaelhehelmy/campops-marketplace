import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { get, post } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Gift, Copy, Check, Users, Gem } from "lucide-react";
import toast from "react-hot-toast";

interface ReferralStats {
  code: string | null;
  used_count: number;
  total_points_earned: number;
}

export default function GuestReferralsPage() {
  const [copied, setCopied] = useState(false);

  const {
    data: stats,
    isLoading,
    refetch,
  } = useQuery<ReferralStats>({
    queryKey: ["referral-stats"],
    queryFn: () => get<ReferralStats>("/loyalty/referral/stats"),
    staleTime: 1000 * 60,
  });

  const generateMut = useMutation({
    mutationFn: () => post<{ code: string }>("/loyalty/referral/generate"),
    onSuccess: () => {
      refetch();
      toast.success("Referral code generated!");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to generate code"),
  });

  function copyCode() {
    if (!stats?.code) return;
    navigator.clipboard.writeText(stats.code).then(() => {
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shareUrl = stats?.code ? `${window.location.origin}/signup?ref=${stats.code}` : null;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Referrals</h1>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="referrals-heading">
        <Gift size={28} /> Referrals
      </h1>

      {/* Code card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your referral code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.code ? (
            <>
              <div className="flex items-center gap-3">
                <span
                  className="text-3xl font-mono font-bold tracking-widest text-primary"
                  data-testid="referral-code"
                >
                  {stats.code}
                </span>
                <Button variant="outline" size="sm" onClick={copyCode} data-testid="copy-code-btn">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              {shareUrl && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Share link</p>
                  <div className="flex items-center gap-2">
                    <code
                      className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate"
                      data-testid="share-url"
                    >
                      {shareUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        toast.success("Link copied!");
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Generate your personal referral code and invite friends to earn Beats!
              </p>
              <Button
                onClick={() => generateMut.mutate()}
                disabled={generateMut.isPending}
                data-testid="generate-code-btn"
              >
                {generateMut.isPending ? "Generating…" : "Generate my code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats?.code && (
        <Card data-testid="referral-stats">
          <CardHeader>
            <CardTitle className="text-base">Your referral stats</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold" data-testid="used-count">
                {stats.used_count}
              </p>
              <p className="text-xs text-muted-foreground">Friends signed up</p>
            </div>
            <div className="text-center">
              <Gem className="h-6 w-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold" data-testid="referral-points-earned">
                {stats.total_points_earned}
              </p>
              <p className="text-xs text-muted-foreground">Beats earned</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claim code section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Were you referred by a friend?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            If you have a referral code from a friend, enter it here to claim your bonus Beats!
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="FRIEND2026"
              className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm font-mono uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="claim-code-input"
            />
            <Button
              size="sm"
              onClick={async () => {
                const input = document.getElementById("claim-code-input") as HTMLInputElement;
                const code = input.value.trim().toUpperCase();
                if (!code) return toast.error("Please enter a code");

                try {
                  await post("/loyalty/referral/claim", { code });
                  toast.success("Referral claimed successfully!");
                  input.value = "";
                  refetch();
                } catch (e: any) {
                  toast.error(e?.message || "Failed to claim referral");
                }
              }}
            >
              Claim
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Generate your unique referral code above.</p>
          <p>2. Share it with friends or family.</p>
          <p>3. When they sign up using your code, you both earn Beats!</p>
          <p>4. Use Beats to get discounts on your stay.</p>
        </CardContent>
      </Card>
    </div>
  );
}
