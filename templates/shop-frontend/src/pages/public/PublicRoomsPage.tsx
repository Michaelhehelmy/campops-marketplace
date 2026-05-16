import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Room, PaginatedResponse } from "@/types/api";
import { BedDouble, Users } from "lucide-react";

export default function PublicRoomsPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.publicRooms,
    queryFn: () => get<PaginatedResponse<Room>>("/public/rooms"),
    staleTime: 1000 * 60,
  });

  const rooms = data?.data ?? [];

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Rooms</h1>
          <p className="text-muted-foreground">
            Browse our selection of comfortable accommodations.
          </p>
        </div>
        <Button asChild data-testid="new-reservation-btn">
          <Link to="/availability">New Reservation</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No rooms available at the moment.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} data-testid="room-card">
              {room.images?.[0] && (
                <img
                  src={room.images[0]}
                  alt={room.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge variant={room.status === "available" ? "success" : "secondary"}>
                    {room.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BedDouble size={16} /> {room.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={16} /> Up to {room.capacity}
                  </span>
                </div>
                {room.rate_plans && (
                  <p className="mt-3 text-lg font-semibold">
                    {room.rate_plans.currency} {room.rate_plans.base_price}
                    <span className="text-sm font-normal text-muted-foreground"> / night</span>
                  </p>
                )}
                {room.amenities && room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {room.amenities.slice(0, 4).map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
