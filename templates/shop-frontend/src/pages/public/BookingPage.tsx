/**
 * Public Booking Page — Multi-step wizard
 * Step 1: Select dates & room
 * Step 2: Enter guest details
 * Step 3: Review & confirm
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { bookingSchema, type BookingFormData } from "@/lib/validation";
import type { Room } from "@/types/api";
import { format, addDays, differenceInDays } from "date-fns";
import toast from "react-hot-toast";
import { Info, AlertTriangle } from "lucide-react";

const STEPS = ["Dates & Room", "Guest Details", "Review & Confirm"] as const;

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const urlGuestCount = parseInt(searchParams.get("guests") || "2") || 2;

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      checkIn: searchParams.get("checkIn") || today,
      checkOut: searchParams.get("checkOut") || tomorrow,
      roomId: searchParams.get("roomId") || "",
      roomType: "",
      guestName: "",
      email: "",
      phone: "",
      guestCount: urlGuestCount,
      notes: "",
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
    trigger,
  } = form;
  const checkIn = watch("checkIn");
  const checkOut = watch("checkOut");

  // Fetch available rooms for selected dates
  const {
    data: availabilityData,
    isLoading: roomsLoading,
    refetch: searchRooms,
  } = useQuery({
    queryKey: queryKeys.availability(checkIn, checkOut),
    queryFn: () =>
      get<{ data: Room[] }>(`/public/availability?check_in=${checkIn}&check_out=${checkOut}`),
    enabled: false,
  });

  const availableRooms = availabilityData?.data ?? [];

  // Booking mutation
  const bookMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      return post<{ reservation_id: string; reference_number: string }>("/public/bookings", data);
    },
    onSuccess: (result) => {
      toast.success(`Booking confirmed! Ref: ${result.reference_number || "Success"}`);
      navigate(`/folio/${result.reservation_id || ""}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Booking failed. Please try again.");
    },
  });

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }
    searchRooms();
  };

  const selectRoom = (room: Room) => {
    setSelectedRoom(room);
    setValue("roomId", room.id);
    setValue("roomType", room.type);
  };

  const nextStep = async () => {
    if (step === 0) {
      if (!selectedRoom) {
        toast.error("Please select a room");
        return;
      }
      const valid = await trigger(["checkIn", "checkOut"]);
      if (valid) setStep(1);
    } else if (step === 1) {
      const valid = await trigger(["guestName", "email", "phone", "guestCount", "notes"]);
      if (valid) setStep(2);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const onSubmit = (data: BookingFormData) => {
    bookMutation.mutate(data);
  };

  const nights =
    checkIn && checkOut ? Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn))) : 0;

  const pricePerNight = selectedRoom?.rate_plans?.base_price || 0;
  const totalPrice = pricePerNight * nights;

  return (
    <div className="container mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Book Your Stay</h1>
      <p className="text-muted-foreground mb-8">Complete the steps below to reserve your room.</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Dates & Room */}
        {step === 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Dates</CardTitle>
                <CardDescription>Choose your check-in and check-out dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="checkIn">Check-in</Label>
                    <Input id="checkIn" type="date" min={today} {...register("checkIn")} />
                    {errors.checkIn && (
                      <p className="text-sm text-destructive mt-1">{errors.checkIn.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="checkOut">Check-out</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      min={checkIn || today}
                      {...register("checkOut")}
                    />
                    {errors.checkOut && (
                      <p className="text-sm text-destructive mt-1">{errors.checkOut.message}</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleSearch}
                      disabled={roomsLoading}
                    >
                      {roomsLoading ? "Searching..." : "Search Rooms"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* House Rules & Reservation Policy */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      Reservation Policy & House Rules
                    </p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Check-in: 3:00 PM | Check-out: 11:00 AM</li>
                      <li>Free cancellation up to 24 hours before check-in</li>
                      <li>Valid ID required at check-in</li>
                      <li>No smoking in rooms - $200 cleaning fee applies</li>
                      <li>Quiet hours: 10:00 PM - 7:00 AM</li>
                      <li>Pets allowed only in designated pet-friendly rooms</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacity Warning */}
            {selectedRoom && selectedRoom.capacity < urlGuestCount && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-800">Capacity Warning</p>
                      <p className="text-sm text-orange-700">
                        This room accommodates up to {selectedRoom.capacity} guests, but you have{" "}
                        {urlGuestCount} guests. You may need to book additional rooms or select a
                        larger room.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Room Results */}
            {roomsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            )}

            {!roomsLoading && availableRooms.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  {availableRooms.length} room{availableRooms.length !== 1 ? "s" : ""} available
                </h3>
                {availableRooms.map((room) => (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id ? "ring-2 ring-primary" : "hover:bg-accent/50"
                    }`}
                    onClick={() => selectRoom(room)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{room.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {room.type} &middot; Up to {room.capacity} guests
                          </p>
                        </div>
                        <div className="text-right">
                          {room.rate_plans && (
                            <p className="text-lg font-semibold">
                              {room.rate_plans.currency} {room.rate_plans.base_price}
                              <span className="text-sm text-muted-foreground font-normal">
                                {" "}
                                / night
                              </span>
                            </p>
                          )}
                          {selectedRoom?.id === room.id && (
                            <Badge variant="success" className="mt-1">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!roomsLoading && availableRooms.length === 0 && availabilityData && (
              <p className="text-center text-muted-foreground py-8">
                No rooms available for the selected dates.
              </p>
            )}
          </div>
        )}

        {/* Step 2: Guest Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Guest Details</CardTitle>
              <CardDescription>Enter the primary guest information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Full Name *</Label>
                <Input id="guestName" placeholder="John Doe" {...register("guestName")} />
                {errors.guestName && (
                  <p className="text-sm text-destructive">{errors.guestName.message}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+1 234 567 890" {...register("phone")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestCount">Number of Guests</Label>
                <Input
                  id="guestCount"
                  type="number"
                  min={1}
                  max={selectedRoom?.capacity || 10}
                  {...register("guestCount", { valueAsNumber: true })}
                />
                {errors.guestCount && (
                  <p className="text-sm text-destructive">{errors.guestCount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Special Requests</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Any special requirements or requests..."
                  {...register("notes")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Booking</CardTitle>
              <CardDescription>Please verify the details before confirming</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Stay Details
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room</span>
                      <span className="font-medium">{selectedRoom?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span>{selectedRoom?.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in</span>
                      <span>{checkIn ? format(new Date(checkIn), "MMM d, yyyy") : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out</span>
                      <span>{checkOut ? format(new Date(checkOut), "MMM d, yyyy") : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nights</span>
                      <span>{nights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guests</span>
                      <span>{watch("guestCount")}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Guest Info
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{watch("guestName")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{watch("email")}</span>
                    </div>
                    {watch("phone") && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span>{watch("phone")}</span>
                      </div>
                    )}
                    {watch("notes") && (
                      <div>
                        <span className="text-muted-foreground">Notes</span>
                        <p className="mt-1 text-xs bg-muted rounded p-2">{watch("notes")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              <div className="border-t pt-4 mt-4">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {nights} night{nights !== 1 ? "s" : ""} &times;{" "}
                      {selectedRoom?.rate_plans?.currency || "USD"} {pricePerNight}
                    </span>
                    <span>
                      {selectedRoom?.rate_plans?.currency || "USD"} {totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>
                      {selectedRoom?.rate_plans?.currency || "USD"} {totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button type="button" variant="outline" onClick={prevStep} disabled={step === 0}>
            Back
          </Button>

          {step < 2 ? (
            <Button type="button" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={bookMutation.isPending}>
              {bookMutation.isPending ? "Confirming..." : "Confirm Booking"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
