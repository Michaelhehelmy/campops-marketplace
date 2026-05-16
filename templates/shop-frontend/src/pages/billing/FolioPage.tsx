/**
 * Folio Page
 * Guest billing statement with charges and payments
 */

import { useState } from "react";
import { useFolio, useCreatePayment } from "@/hooks/queries/useBilling";
import { useMyProfile } from "@/hooks/queries/useGuests";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { FolioCharge, Payment } from "@/types/api";
import { useParams } from "react-router-dom";
import { useMarkFolioAsPaid, useAdjustFolio, useCashPayment } from "@/hooks/queries/useBilling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/Textarea";
import toast from "react-hot-toast";
import { Banknote, Edit3, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function FolioPage() {
  const { id: paramId } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "manager";

  const { data: profile } = useMyProfile();
  const folioId = paramId || profile?.id || "";
  const { data: folio, isLoading } = useFolio(folioId);
  const createPayment = useCreatePayment();
  const markAsPaid = useMarkFolioAsPaid();
  const adjustFolio = useAdjustFolio();
  const cashPayment = useCashPayment();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "points">("cash");

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"discount" | "surcharge">("discount");

  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile && !folio) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <h1 className="text-3xl font-bold mb-6" data-testid="billing-heading">
          Your Bill
        </h1>
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground">
              Guest record not found. Please contact support if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!folio) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <h1 className="text-3xl font-bold mb-6" data-testid="billing-heading">
          Your Bill
        </h1>
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground">No active folio found for your reservation.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    await createPayment.mutateAsync({ folio_id: folio.id, amount, method: paymentMethod });
    setShowPaymentModal(false);
    setPaymentAmount("");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6" data-testid="billing-heading">
        Your Bill
      </h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(Number(folio.total_charges || 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(Number(folio.total_payments || 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${Number(folio.balance || 0) > 0 ? "text-destructive" : "text-green-600"}`}
            >
              {formatCurrency(Number(folio.balance || 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle data-testid="charges-heading">Charges</CardTitle>
        </CardHeader>
        <CardContent>
          {folio.charges?.length > 0 ? (
            <div className="space-y-2">
              {folio.charges.map((charge: FolioCharge) => (
                <div key={charge.id} className="flex justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{charge.description}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(charge.created_at)}</p>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(Number(charge.total_price || charge.amount || 0))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No charges yet</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle data-testid="payments-heading">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {folio.payments?.length > 0 ? (
            <div className="space-y-2">
              {folio.payments.map((payment: Payment) => (
                <div key={payment.id} className="flex justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{payment.method} Payment</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No payments yet</p>
          )}
        </CardContent>
      </Card>

      {folio.balance > 0 && !isAdmin && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => setShowPaymentModal(true)}
          data-testid="make-payment-button"
        >
          Make Payment
        </Button>
      )}

      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-3 mt-8 p-6 bg-primary/5 rounded-xl border border-primary/20">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Admin Controls</h3>
            <p className="text-sm text-muted-foreground">
              Manage payments and adjustments for this folio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setCashAmount(folio.balance.toString());
                setShowCashModal(true);
              }}
              data-testid="admin-cash-button"
            >
              <Banknote size={16} /> Cash Payment
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowAdjustModal(true)}
              data-testid="admin-adjust-button"
            >
              <Edit3 size={16} /> Adjust Invoice
            </Button>
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={async () => {
                if (window.confirm("Mark this entire folio as paid?")) {
                  await markAsPaid.mutateAsync({ folio_id: folio.id });
                  toast.success("Folio marked as paid");
                }
              }}
              disabled={markAsPaid.isPending || folio.balance <= 0}
              data-testid="admin-mark-paid-button"
            >
              <CheckCircle size={16} /> Mark as Paid
            </Button>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={adjustType === "discount" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustType("discount")}
              >
                Discount
              </Button>
              <Button
                variant={adjustType === "surcharge" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setAdjustType("surcharge")}
              >
                Surcharge
              </Button>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="0.00"
                data-testid="adjust-amount-input"
              />
            </div>
            <div>
              <Label>Description / Note</Label>
              <Textarea
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment..."
                data-testid="adjust-note-input"
              />
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                await adjustFolio.mutateAsync({
                  folio_id: folio.id,
                  amount: parseFloat(adjustAmount),
                  description:
                    adjustNote ||
                    (adjustType === "discount" ? "Manual Discount" : "Manual Surcharge"),
                  type: adjustType,
                });
                setShowAdjustModal(false);
                setAdjustAmount("");
                setAdjustNote("");
                toast.success("Adjustment applied");
              }}
              disabled={adjustFolio.isPending || !adjustAmount}
              data-testid="confirm-adjust-button"
            >
              {adjustFolio.isPending ? "Applying..." : "Apply Adjustment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Modal */}
      <Dialog open={showCashModal} onOpenChange={setShowCashModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Cash Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount Received</Label>
              <Input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.00"
                data-testid="cash-amount-input"
              />
            </div>
            <div>
              <Label>Note (Optional)</Label>
              <Input
                value={cashNote}
                onChange={(e) => setCashNote(e.target.value)}
                placeholder="e.g. Receipt #1234"
                data-testid="cash-note-input"
              />
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                await cashPayment.mutateAsync({
                  folio_id: folio.id,
                  amount: parseFloat(cashAmount),
                  note: cashNote,
                });
                setShowCashModal(false);
                setCashAmount("");
                setCashNote("");
                toast.success("Cash payment recorded");
              }}
              disabled={cashPayment.isPending || !cashAmount}
              data-testid="confirm-cash-button"
            >
              {cashPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Make Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max: ${formatCurrency(folio.balance)}`}
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <div className="flex gap-2 mt-2">
                  {(["cash", "card", "points"] as const).map((method) => (
                    <Button
                      key={method}
                      variant={paymentMethod === method ? "default" : "outline"}
                      onClick={() => setPaymentMethod(method)}
                      className="capitalize"
                    >
                      {method}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={createPayment.isPending || !paymentAmount}
                >
                  {createPayment.isPending ? "Processing..." : "Pay"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
