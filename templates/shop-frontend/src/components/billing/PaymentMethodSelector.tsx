import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/Label";
import { CreditCard, Wallet, Banknote, Landmark, ArrowRight } from "lucide-react";
import { post } from "@/lib/api";
import toast from "react-hot-toast";

interface PaymentMethodSelectorProps {
  folioId: string;
  amount: number;
  currency: string;
}

const providers = [
  {
    id: "stripe",
    name: "Stripe (Credit Card)",
    icon: CreditCard,
    description: "Pay securely with your credit or debit card",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: Wallet,
    description: "Quick checkout with your PayPal account",
  },
  { id: "payoneer", name: "Payoneer", icon: Landmark, description: "Global business payments" },
  { id: "elevate", name: "Elevate Pay", icon: Banknote, description: "Direct wallet transfer" },
  { id: "instapay", name: "InstaPay", icon: Landmark, description: "Fast local bank transfer" },
];

export function PaymentMethodSelector({ folioId, amount, currency }: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState("stripe");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handlePay = async () => {
    if (amount <= 0) {
      toast.error("Balance must be greater than zero");
      return;
    }

    setLoading(true);
    try {
      const response = await post<{ paymentUrl: string }>(`/payments/${selected}/initiate`, {
        folioId,
        amount,
        currency,
      });

      if (response.paymentUrl) {
        toast.success("Redirecting to secure payment page...");
        window.location.href = response.paymentUrl;
      } else {
        toast.error("Failed to initiate payment. Please try again.");
      }
    } catch (error: any) {
      // toast is handled by api.ts interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full md:w-auto font-bold bg-primary hover:bg-primary/90 shadow-lg gap-2"
          data-testid="pay-now-button"
        >
          <CreditCard className="h-5 w-5" />
          Pay Full Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Secure Payment</DialogTitle>
            <DialogDescription>
              Choose your preferred payment method to settle your bill.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex justify-between items-end">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Amount Due
              </p>
              <p className="text-3xl font-black text-primary">
                {currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-background px-3 py-1 rounded-full border border-primary/20 text-[10px] font-bold text-primary flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Secure Encrypted
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`group flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected === p.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted hover:border-primary/30 hover:bg-muted/30"
              }`}
              onClick={() => setSelected(p.id)}
            >
              <div
                className={`p-3 rounded-lg ${selected === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"} transition-colors`}
              >
                <p.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor={p.id} className="text-base font-bold cursor-pointer">
                    {p.name}
                  </Label>
                  <input
                    type="radio"
                    id={p.id}
                    name="payment-provider"
                    checked={selected === p.id}
                    onChange={() => setSelected(p.id)}
                    data-testid={`payment-method-${p.id}`}
                    className="h-4 w-4 accent-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-muted/30 border-t">
          <Button
            onClick={handlePay}
            disabled={loading || amount <= 0}
            className="w-full h-12 text-lg font-bold gap-2 shadow-md group"
            data-testid="confirm-payment-button"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin border-2 border-primary-foreground border-t-transparent rounded-full" />
                Initializing...
              </span>
            ) : (
              <>
                Confirm & Pay
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase tracking-tighter">
            By clicking confirm, you will be redirected to the selected payment gateway.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
