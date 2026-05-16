import { useMyFolios } from "@/hooks/queries/useBilling";
import type { FolioCharge, Payment } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSocketEvent } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { format } from "date-fns";
import { DollarSign, CreditCard, Receipt, Download, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { PaymentMethodSelector } from "@/components/billing/PaymentMethodSelector";

export default function LiveBillPage() {
  const { data: folios, isLoading } = useMyFolios();
  const qc = useQueryClient();

  useSocketEvent("PAYMENT_RECEIVED", (_payload: any) => {
    qc.invalidateQueries({ queryKey: queryKeys.folios });
  });

  useSocketEvent("ORDER_CREATED", (_payload: any) => {
    qc.invalidateQueries({ queryKey: queryKeys.folios });
  });

  useSocketEvent("FOLIO_UPDATED", (_payload: any) => {
    qc.invalidateQueries({ queryKey: queryKeys.folios });
  });

  const folio = Array.isArray(folios) ? folios[0] : folios;
  const currency = folio?.currency || "KES";

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!folio) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Live Bill</h1>
        <Card
          className="border-none shadow-xl bg-card/50 backdrop-blur-sm"
          data-testid="live-bill-empty"
        >
          <CardContent className="py-20 text-center">
            <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Receipt className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Active Folio Found</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We couldn't find an active billing account for your current stay. Please contact
              reception if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRequestCheckout = () => {
    toast.success("Checkout request sent to reception.");
  };

  const charges = Array.isArray(folio.charges) ? folio.charges : [];
  const payments = Array.isArray(folio.payments) ? folio.payments : [];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight" data-testid="live-bill-heading">
            Live Bill
          </h1>
          <p className="text-muted-foreground mt-1">Real-time view of your stay expenses</p>
        </div>
        <div className="flex gap-2">
          {Number(folio?.balance || 0) > 0 && (
            <PaymentMethodSelector
              folioId={folio.id}
              amount={Number(folio.balance)}
              currency={currency}
            />
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={16} /> PDF Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRequestCheckout}
            data-testid="request-checkout-button"
          >
            <Clock size={16} /> Request Checkout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-primary/5">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="p-3 bg-primary/10 rounded-full mb-4">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Total Charges
            </p>
            <p className="text-3xl font-bold" data-testid="total-charges-value">
              {currency}{" "}
              {Number(folio.total_charges || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-green-50/50">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="p-3 bg-green-100 rounded-full mb-4">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Total Paid
            </p>
            <p className="text-3xl font-bold text-green-600" data-testid="total-paid-value">
              {currency}{" "}
              {Number(folio.total_payments || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-orange-50/50">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="p-3 bg-orange-100 rounded-full mb-4">
              <Receipt className="h-6 w-6 text-orange-600" />
            </div>
            <p
              className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1"
              data-testid="balance-label"
            >
              Current Balance
            </p>
            <p
              className={`text-3xl font-bold ${Number(folio.balance || 0) > 0 ? "text-orange-600" : "text-green-600"}`}
              data-testid="balance-value"
            >
              {currency}{" "}
              {Number(folio.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle data-testid="charges-title">Charges Breakdown</CardTitle>
              <CardDescription>Itemized list of all stay expenses</CardDescription>
            </div>
            <Badge variant="outline" className="bg-background">
              {charges.length} Items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {charges.length === 0 ? (
            <div className="py-20 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground" data-testid="no-charges-msg">
                No charges have been posted yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {charges.map((c: FolioCharge) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center p-6 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      {c.category === "Food & Beverage"
                        ? "🍽️"
                        : c.category === "Accommodation"
                          ? "🏨"
                          : "✨"}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{c.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase tracking-tighter h-5"
                        >
                          {c.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} />
                          {format(new Date(c.posted_at || c.created_at), "MMM d, yyyy HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">
                      {currency}{" "}
                      {Number(c.amount || c.total_price || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    {c.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {c.quantity} x {currency} {Number(c.unit_price).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
