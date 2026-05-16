import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Plane, Plus, X } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useBranding } from "@/contexts/BrandingContext";

interface Transfer {
  id: string;
  transfer_type: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_datetime: string;
  guest_count: number;
  status: string;
  notes?: string;
  price: number;
}

const statusVariant: Record<string, any> = {
  scheduled: "default",
  completed: "success",
  cancelled: "destructive",
  in_progress: "secondary",
};

export default function GuestTransfersPage() {
  const qc = useQueryClient();
  const branding = useBranding();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pickup_location: "",
    dropoff_location: "",
    pickup_datetime: "",
    guest_count: "1",
    flight_number: "",
    notes: "",
    transfer_type: "airport_pickup",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["guest_transfers"],
    queryFn: () => get<{ data: Transfer[] }>("/guests/transfers"),
    staleTime: 1000 * 60,
  });

  const transfers = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: (body: typeof form) =>
      post("/guests/transfers", {
        ...body,
        guest_count: Number(body.guest_count) || 1,
      }),
    onSuccess: () => {
      toast.success("Transfer request submitted!");
      qc.invalidateQueries({ queryKey: ["guest_transfers"] });
      setShowForm(false);
      setForm({
        pickup_location: "",
        dropoff_location: "",
        pickup_datetime: "",
        guest_count: "1",
        flight_number: "",
        notes: "",
        transfer_type: "airport_pickup",
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit transfer request");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pickup_location || !form.dropoff_location || !form.pickup_datetime) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMut.mutate(form);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="transfers-heading">
          Airport Transfers
        </h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          data-testid="new-transfer-btn"
          className="flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Transfer"}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6" data-testid="transfer-form-card">
          <CardHeader>
            <CardTitle>Request a Transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              data-testid="transfer-form"
              noValidate
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_location">Pickup Location *</Label>
                  <Input
                    id="pickup_location"
                    value={form.pickup_location}
                    onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))}
                    placeholder="e.g. JKIA Terminal 1A"
                    required
                    data-testid="pickup-location-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff_location">Drop-off Location *</Label>
                  <Input
                    id="dropoff_location"
                    value={form.dropoff_location}
                    onChange={(e) => setForm((f) => ({ ...f, dropoff_location: e.target.value }))}
                    placeholder={`e.g. ${branding.appName}`}
                    required
                    data-testid="dropoff-location-input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_datetime">Pickup Date & Time *</Label>
                  <Input
                    id="pickup_datetime"
                    type="datetime-local"
                    value={form.pickup_datetime}
                    onChange={(e) => setForm((f) => ({ ...f, pickup_datetime: e.target.value }))}
                    required
                    data-testid="pickup-datetime-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest_count">Number of Passengers</Label>
                  <Input
                    id="guest_count"
                    type="number"
                    min="1"
                    max="20"
                    value={form.guest_count}
                    onChange={(e) => setForm((f) => ({ ...f, guest_count: e.target.value }))}
                    data-testid="guest-count-input"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flight_number">Flight Number (optional)</Label>
                  <Input
                    id="flight_number"
                    value={form.flight_number}
                    onChange={(e) => setForm((f) => ({ ...f, flight_number: e.target.value }))}
                    placeholder="e.g. KQ101"
                    data-testid="flight-number-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer_notes">Notes (optional)</Label>
                  <Input
                    id="transfer_notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Any special requirements"
                    data-testid="transfer-notes-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createMut.isPending}
                data-testid="submit-transfer-btn"
              >
                {createMut.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : transfers.length === 0 ? (
        <Card data-testid="no-transfers">
          <CardContent className="py-12 text-center">
            <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transfer requests yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "New Transfer" to book an airport pickup or drop-off.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="transfers-list">
          {transfers.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Plane size={16} className="text-muted-foreground shrink-0" />
                      <p className="font-medium text-sm">
                        {t.pickup_location} → {t.dropoff_location}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.pickup_datetime), "MMM d, yyyy HH:mm")} · {t.guest_count}{" "}
                      passenger{t.guest_count !== 1 ? "s" : ""}
                    </p>
                    {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
                  </div>
                  <Badge variant={statusVariant[t.status] ?? "default"} className="shrink-0">
                    {t.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
