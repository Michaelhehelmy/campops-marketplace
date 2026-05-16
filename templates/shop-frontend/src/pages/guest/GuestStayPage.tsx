import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Reservation } from "@/types/api";
import { format } from "date-fns";
import { BedDouble, Calendar, Users, Receipt } from "lucide-react";

export default function GuestStayPage() {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.reservations, "my"],
    queryFn: () => get<{ data: Reservation[] }>("/reservations/me"),
    staleTime: 1000 * 60,
  });

  const reservations = data?.data ?? [];
  const active = reservations.find((r) => ["confirmed", "checked_in"].includes(r.status));

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6" data-testid="stay-heading">
        Stay
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48" />
        </div>
      ) : !active ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BedDouble className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="no-active-stay">
              No Active Stay
            </h2>
            <p className="text-muted-foreground">
              You don't have any upcoming or active reservation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle data-testid="reservation-title">
                Reservation #{active.id.slice(0, 8)}
              </CardTitle>
              <Badge
                data-testid="reservation-status"
                variant={active.status === "checked_in" ? "success" : "default"}
              >
                {active.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                {active.room_name && (
                  <div className="flex items-center gap-2">
                    <BedDouble size={18} className="text-muted-foreground" />
                    <span>
                      Room: <strong>{active.room_name}</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-muted-foreground" />
                  <span>
                    {active.check_in && format(new Date(active.check_in), "MMM d")} —{" "}
                    {active.check_out && format(new Date(active.check_out), "MMM d, yyyy")}
                  </span>
                </div>
                {active.reference_number && (
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-muted-foreground" />
                    <span data-testid="reference-number">
                      Reference: <strong>{active.reference_number}</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-muted-foreground" />
                  <span>
                    {active.guest_count} guest{active.guest_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {active.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{active.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {active && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg" data-testid="amenities-heading">
              Stay Amenities & Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-primary" />
                High-speed WiFi
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-primary" />
                Air Conditioning
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-primary" />
                Room Service
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="w-2 h-2 rounded-full p-0 bg-primary" />
                Flat-screen TV
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reservations.length > 1 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4" data-testid="past-reservations-heading">
            Past Reservations
          </h2>
          <div className="space-y-3">
            {reservations
              .filter((r) => r.id !== active?.id)
              .map((r) => (
                <Card key={r.id}>
                  <CardContent className="py-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{r.room_name || "Room"}</p>
                      <p className="text-sm text-muted-foreground">
                        {r.check_in && format(new Date(r.check_in), "MMM d")} —{" "}
                        {r.check_out && format(new Date(r.check_out), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="secondary">{r.status.replace("_", " ")}</Badge>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
