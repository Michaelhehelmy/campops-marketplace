import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { GuestFolio } from "@/types/api";
import { format } from "date-fns";
import { Receipt, CreditCard, DollarSign, Phone, Music, X } from "lucide-react";
import toast from "react-hot-toast";

type PaymentMethod = "mpesa" | "card" | "points";

export default function PublicFolioPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const qc = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mpesa");
  const [payAmount, setPayAmount] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);

  const {
    data: folio,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.publicFolio(reservationId!),
    queryFn: () => get<GuestFolio>(`/public/folio/${reservationId}`),
    enabled: !!reservationId,
  });

  const mpesaMut = useMutation({
    mutationFn: (data: { phone: string; amount: number }) =>
      post(`/folios/${folio!.id}/mpesa-pay`, data),
    onSuccess: () => {
      toast.success("M-Pesa request sent! Check your phone.");
      setPaymentPending(true);
      // Poll for payment
      const interval = setInterval(async () => {
        await qc.invalidateQueries({ queryKey: queryKeys.publicFolio(reservationId!) });
      }, 3000);
      setTimeout(() => {
        clearInterval(interval);
        setPaymentPending(false);
      }, 60000);
    },
    onError: () => toast.error("M-Pesa payment failed"),
  });

  const cardMut = useMutation({
    mutationFn: (data: { amount: number; folio_id: string }) =>
      post("/payments", { ...data, payment_method: "card" }),
    onSuccess: () => {
      toast.success("Payment processed!");
      qc.invalidateQueries({ queryKey: queryKeys.publicFolio(reservationId!) });
      setShowPayment(false);
    },
    onError: () => toast.error("Card payment failed"),
  });

  const pointsMut = useMutation({
    mutationFn: (data: { amount: number; folio_id: string; guest_id: string }) =>
      post("/payments", { ...data, payment_method: "points" }),
    onSuccess: () => {
      toast.success("Points redeemed!");
      qc.invalidateQueries({ queryKey: queryKeys.publicFolio(reservationId!) });
      setShowPayment(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "Points payment failed");
    },
  });

  function handlePay() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!folio) return;

    switch (payMethod) {
      case "mpesa":
        if (!mpesaPhone || !/^254\d{9}$/.test(mpesaPhone)) {
          toast.error("Enter a valid phone (254XXXXXXXXX)");
          return;
        }
        mpesaMut.mutate({ phone: mpesaPhone, amount });
        break;
      case "card":
        cardMut.mutate({ amount, folio_id: folio.id });
        break;
      case "points":
        pointsMut.mutate({ amount, folio_id: folio.id, guest_id: folio.guest_id });
        break;
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-6 py-12">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !folio) {
    return (
      <div className="container mx-auto max-w-3xl px-6 py-12 text-center">
        <Receipt className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Folio Not Found</h1>
        <p className="text-muted-foreground">
          The reservation ID may be incorrect or the folio is not available.
        </p>
      </div>
    );
  }

  const isPaying = mpesaMut.isPending || cardMut.isPending || pointsMut.isPending;

  return (
    <div className="container mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Folio</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Charges</p>
            <p className="text-2xl font-bold">
              {folio.currency} {folio.total_charges.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {folio.currency} {folio.total_payments.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Receipt className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Balance Due</p>
            <p
              className={`text-2xl font-bold ${folio.balance > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {folio.currency} {folio.balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charges */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Charges</CardTitle>
        </CardHeader>
        <CardContent>
          {folio.charges.length === 0 ? (
            <p className="text-muted-foreground text-sm">No charges yet.</p>
          ) : (
            <div className="space-y-2">
              {folio.charges.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{c.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.category}</Badge>
                    <span className="font-semibold">
                      {folio.currency} {c.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {folio.payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments recorded.</p>
          ) : (
            <div className="space-y-2">
              {folio.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{p.method.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span className="font-semibold text-green-600">
                    - {folio.currency} {p.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Balance */}
      {folio.balance > 0 && !showPayment && (
        <div className="text-center">
          <Button
            size="lg"
            onClick={() => {
              setShowPayment(true);
              setPayAmount(folio.balance.toFixed(2));
            }}
          >
            Pay Balance ({folio.currency} {folio.balance.toFixed(2)})
          </Button>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Make a Payment</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowPayment(false)}>
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {paymentPending && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Waiting for M-Pesa confirmation...</p>
                <p className="text-xs text-muted-foreground">Check your phone and enter your PIN</p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div>
              <Label className="mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "mpesa" as const, label: "M-Pesa", icon: Phone },
                  { key: "card" as const, label: "Card", icon: CreditCard },
                  { key: "points" as const, label: "Points", icon: Music },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPayMethod(m.key)}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${
                      payMethod === m.key
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <m.icon className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label>Amount ({folio.currency})</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                min={0}
                max={folio.balance}
                step="0.01"
              />
            </div>

            {/* M-Pesa Phone */}
            {payMethod === "mpesa" && (
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="254712345678"
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: 254XXXXXXXXX (no + or spaces)
                </p>
              </div>
            )}

            {/* Points Info */}
            {payMethod === "points" && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Points Redemption</p>
                <p className="text-muted-foreground">
                  Points will be deducted from your loyalty balance. Maximum redemption is 50% of
                  the total bill. Minimum 100 points required.
                </p>
              </div>
            )}

            {/* Card Info */}
            {payMethod === "card" && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Card Payment</p>
                <p className="text-muted-foreground">
                  You will be redirected to the secure payment gateway to complete the transaction.
                </p>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handlePay} disabled={isPaying}>
              {isPaying ? "Processing..." : `Pay ${folio.currency} ${payAmount || "0.00"}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
