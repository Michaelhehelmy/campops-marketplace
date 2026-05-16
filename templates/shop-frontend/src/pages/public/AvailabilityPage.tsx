import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Room } from "@/types/api";
import { format, addDays } from "date-fns";
import { Users, Info, Home, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AvailabilityPage() {
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guestCount, setGuestCount] = useState(2);
  const [searching, setSearching] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.availability(checkIn, checkOut),
    queryFn: () =>
      get<{ data: Room[] }>(`/public/availability?check_in=${checkIn}&check_out=${checkOut}`),
    enabled: searching && !!checkIn && !!checkOut,
  });

  const allRooms = data?.data ?? [];
  // Filter rooms that can accommodate at least 1 guest from the party
  const suitableRooms = allRooms.filter((room) => room.capacity >= 1);
  // Rooms that can fit all guests in one room
  const singleRoomOptions = suitableRooms.filter((room) => room.capacity >= guestCount);
  // Check if we need multiple rooms
  const needsMultipleRooms = singleRoomOptions.length === 0 && suitableRooms.length > 0;

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Availability</h1>
      <p className="text-muted-foreground mb-8">Select your dates to see available rooms.</p>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="check_in">Check-in</Label>
              <Input
                id="check_in"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={today}
              />
            </div>
            <div>
              <Label htmlFor="check_out">Check-out</Label>
              <Input
                id="check_out"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || today}
              />
            </div>
            <div>
              <Label htmlFor="guest_count">
                <Users className="inline h-4 w-4 mr-1" />
                Guests
              </Label>
              <Input
                id="guest_count"
                type="number"
                min={1}
                max={20}
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => setSearching(true)}
                disabled={!checkIn || !checkOut}
              >
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* House Rules & Reservation Policy */}
      <Card className="mb-8 bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Reservation Policy</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Check-in: 3:00 PM | Check-out: 11:00 AM</li>
                <li>Free cancellation up to 24 hours before check-in</li>
                <li>Valid ID required at check-in</li>
                <li>No smoking in rooms</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {searching && isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}

      {searching && !isLoading && allRooms.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No rooms available for the selected dates.
        </p>
      )}

      {/* Multiple rooms needed warning */}
      {searching && !isLoading && needsMultipleRooms && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Multiple Rooms Recommended</p>
                <p className="text-sm text-yellow-700">
                  No single room can accommodate {guestCount} guests. You may need to book multiple
                  rooms.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single room options */}
      {searching && !isLoading && singleRoomOptions.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Home className="h-5 w-5" />
            Perfect for your group ({guestCount} guests)
          </h2>
          {singleRoomOptions.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge variant="success">Fits all guests</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    {room.type} &middot; Up to {room.capacity} guests
                  </span>
                  {room.rate_plans && (
                    <span className="text-lg font-semibold">
                      {room.rate_plans.currency} {room.rate_plans.base_price} / night
                    </span>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/booking?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guestCount}`
                    )
                  }
                >
                  Book This Room <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* All available rooms */}
      {searching && !isLoading && suitableRooms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {suitableRooms.length} room{suitableRooms.length !== 1 ? "s" : ""} available
          </h2>
          {suitableRooms.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <Badge variant={room.capacity >= guestCount ? "success" : "secondary"}>
                    {room.capacity >= guestCount
                      ? "Fits all guests"
                      : `Up to ${room.capacity} guests`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    {room.type} &middot; Max {room.capacity} guests
                  </span>
                  {room.rate_plans && (
                    <span className="text-lg font-semibold">
                      {room.rate_plans.currency} {room.rate_plans.base_price} / night
                    </span>
                  )}
                </div>
                <Button
                  variant={room.capacity >= guestCount ? "default" : "outline"}
                  className="w-full"
                  onClick={() =>
                    navigate(
                      `/booking?roomId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guestCount}`
                    )
                  }
                >
                  {room.capacity >= guestCount
                    ? "Book This Room"
                    : "Book This Room (Partial Capacity)"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
