import React from 'react';

/**
 * Public Booking Widget
 * ──────────────────────
 * Slot: public.booking
 * Allows public users to search availability and book plugin_booking_rooms
 */
export function PublicBookingWidget({
  listingId,
  propertyName,
}: {
  listingId: string;
  propertyName: string;
}) {
  const [checkIn, setCheckIn] = React.useState('');
  const [checkOut, setCheckOut] = React.useState('');
  const [adults, setAdults] = React.useState(2);
  const [loading, setLoading] = React.useState(false);
  const [availableRooms, setAvailableRooms] = React.useState<any[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    const body = {
      listingId,
      checkIn,
      checkOut,
      adults,
    };
    console.log('[PublicBookingWidget] Sending availability request:', JSON.stringify(body));
    try {
      const res = await fetch('/api/p/booking/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setAvailableRooms(data.availableRooms || []);
    } catch (error) {
      console.error('Failed to check availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (roomId: string, roomName: string, price: number) => {
    const params = new URLSearchParams({
      propertyId: listingId,
      propertyName,
      roomTypeId: roomId,
      roomName,
      checkIn,
      checkOut,
      adults: adults.toString(),
      price: price.toString(),
      priceCurrency: 'USD',
    });
    window.location.href = `/en/book/summary?${params.toString()}`;
  };

  return (
    <div data-testid="booking-real" role="region" aria-label="Book Your Stay" className="space-y-4">
      <h3 className="font-bold text-lg">Book Your Stay</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Check-in</label>
          <input
            data-testid="check-in-input"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Check-out</label>
          <input
            data-testid="check-out-input"
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Guests</label>
        <input
          data-testid="guests-input"
          type="number"
          value={adults}
          onChange={(e) => setAdults(parseInt(e.target.value))}
          min="1"
          className="w-full border rounded-lg p-2"
        />
      </div>
      <button
        type="button"
        data-testid="search-button"
        onClick={handleSearch}
        disabled={loading}
        className="w-full bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Searching...' : 'Check Availability'}
      </button>
      {availableRooms.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="font-bold">Available Rooms</h4>
          {availableRooms.map(({ room, availability, totalPrice }) => (
            <div
              key={room.id}
              data-testid={`room-item-${room.id}`}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-bold">{room.name}</div>
                <div className="text-sm text-gray-600">{availability} nights</div>
              </div>
              <button
                data-testid={`book-button-${room.id}`}
                onClick={() => handleBook(room.id, room.name, totalPrice)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700"
              >
                Book ${totalPrice}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Manager Bookings List
 * ──────────────────────
 * Slot: manager.bookings
 * Shows all bookings for a property with management actions
 */
export function ManagerBookingsList({ listingId }: { listingId: string }) {
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/p/bookings?listing=${listingId}`)
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings || []))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleCheckIn = async (bookingId: string) => {
    await fetch(`/api/p/booking/${bookingId}/check-in`, { method: 'PATCH' });
    const res = await fetch(`/api/p/bookings?listing=${listingId}`);
    const data = await res.json();
    setBookings(data.bookings || []);
  };

  const handleCheckOut = async (bookingId: string) => {
    await fetch(`/api/p/booking/${bookingId}/check-out`, { method: 'PATCH' });
    const res = await fetch(`/api/p/bookings?listing=${listingId}`);
    const data = await res.json();
    setBookings(data.bookings || []);
  };

  if (loading) return <div>Loading bookings...</div>;

  return (
    <div data-testid="manager-bookings-list" className="space-y-4">
      <h3 className="font-bold text-lg">Bookings</h3>
      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings found</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              data-testid={`booking-item-${booking.id}`}
              className="border rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{booking.guest_name}</div>
                  <div className="text-sm text-gray-600">{booking.guest_email}</div>
                  <div className="text-sm">
                    {booking.check_in} → {booking.check_out}
                  </div>
                  <div className="text-sm font-bold">${booking.total_price}</div>
                  <div className="text-xs px-2 py-1 rounded-full inline-block bg-gray-100">
                    {booking.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  {booking.status === 'confirmed' && (
                    <button
                      data-testid={`check-in-button-${booking.id}`}
                      onClick={() => handleCheckIn(booking.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-700"
                    >
                      Check In
                    </button>
                  )}
                  {booking.status === 'checked_in' && (
                    <button
                      data-testid={`check-out-button-${booking.id}`}
                      onClick={() => handleCheckOut(booking.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700"
                    >
                      Check Out
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Staff Check-In Panel
 * ────────────────────
 * Slot: staff.checkins
 * Shows today's check-ins with limited actions
 */
export function StaffCheckInPanel({ listingId }: { listingId: string }) {
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/p/bookings?listing=${listingId}&status=confirmed`)
      .then((res) => res.json())
      .then((data) => {
        const todayBookings = (data.bookings || []).filter((b: any) => b.check_in === today);
        setBookings(todayBookings);
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleCheckIn = async (bookingId: string) => {
    await fetch(`/api/p/booking/${bookingId}/check-in`, { method: 'PATCH' });
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/p/bookings?listing=${listingId}&status=confirmed`);
    const data = await res.json();
    const todayBookings = (data.bookings || []).filter((b: any) => b.check_in === today);
    setBookings(todayBookings);
  };

  if (loading) return <div>Loading today's check-ins...</div>;

  return (
    <div data-testid="staff-checkin-panel" className="space-y-4">
      <h3 className="font-bold text-lg">Today's Check-ins</h3>
      {bookings.length === 0 ? (
        <p className="text-gray-500">No check-ins today</p>
      ) : (
        <div className="space-y-2">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-bold">{booking.guest_name}</div>
                <div className="text-sm text-gray-600">{booking.check_in}</div>
              </div>
              <button
                onClick={() => handleCheckIn(booking.id)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-700"
              >
                Check In
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Guest Reservations List
 * ────────────────────────
 * Slot: guest.dashboard
 * Shows guest's upcoming reservations
 */
export function GuestReservationsList({ guestEmail }: { guestEmail: string }) {
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/p/bookings')
      .then((res) => res.json())
      .then((data) => {
        const guestBookings = (data.bookings || []).filter(
          (b: any) => b.guest_email === guestEmail && b.status !== 'cancelled'
        );
        setReservations(guestBookings);
      })
      .finally(() => setLoading(false));
  }, [guestEmail]);

  if (loading) return <div>Loading reservations...</div>;

  return (
    <div data-testid="guest-reservations-list" className="space-y-4">
      <h3 className="font-bold text-lg">My Reservations</h3>
      {reservations.length === 0 ? (
        <p className="text-gray-500">No upcoming reservations</p>
      ) : (
        <div className="space-y-2">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="border rounded-lg p-4">
              <div className="font-bold">{reservation.listing_id}</div>
              <div className="text-sm">
                {reservation.check_in} → {reservation.check_out}
              </div>
              <div className="text-sm font-bold">${reservation.total_price}</div>
              <div className="text-xs px-2 py-1 rounded-full inline-block bg-gray-100">
                {reservation.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Register components with the registry
 */
export function registerPlugin(registry: any) {
  registry.register('booking:PublicBookingWidget', PublicBookingWidget);
  registry.register('booking:ManagerBookingsList', ManagerBookingsList);
  registry.register('booking:StaffCheckInPanel', StaffCheckInPanel);
  registry.register('booking:GuestReservationsList', GuestReservationsList);
}
