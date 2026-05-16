import type { CheckAvailabilityInput } from '../schemas';

/**
 * Room Service
 * ────────────
 * Core business logic for room operations
 */
export class RoomService {
  constructor(private db: any) {}

  async getRoomsByListing(listingId: string) {
    const roomsList = await this.db.query(
      `SELECT * FROM plugin_booking_rooms WHERE listing_id = ? AND is_active = 1 ORDER BY created_at`,
      [listingId]
    );
    return roomsList;
  }

  async getRoomById(id: string) {
    const room = await this.db.queryOne(`SELECT * FROM plugin_booking_rooms WHERE id = ?`, [id]);
    return room;
  }

  async checkAvailability(input: CheckAvailabilityInput) {
    // Get plugin_booking_rooms for the listing
    const roomsList = await this.getRoomsByListing(input.listingId);

    // Check availability for each room
    const availableRooms = [];
    const checkInDate = new Date(input.checkIn);
    const checkOutDate = new Date(input.checkOut);

    for (const room of roomsList) {
      // Check capacity
      if (room.capacity < input.adults + input.children) {
        continue;
      }

      // Check availability for each date in the range
      const dates = [];
      const currentDate = new Date(checkInDate);
      while (currentDate < checkOutDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let isAvailable = true;
      let totalPrice = 0;

      for (const date of dates) {
        // Check room availability
        const availability = await this.db.queryOne(
          `SELECT * FROM plugin_booking_room_availability WHERE room_id = ? AND date = ? AND available >= 1`,
          [room.id, date]
        );

        if (!availability) {
          console.log(`[RoomService] No availability found for room ${room.id} on date ${date}`);
          isAvailable = false;
          break;
        }

        if (availability.available < 1) {
          console.log(`[RoomService] Room ${room.id} is sold out on date ${date}`);
          isAvailable = false;
          break;
        }

        totalPrice += availability.price;
      }

      if (isAvailable) {
        console.log(`[RoomService] Room ${room.id} is available for the requested range`);
      }

      // Check for existing bookings that overlap
      if (isAvailable) {
        const overlappingBookings = await this.db.query(
          `SELECT * FROM plugin_booking_bookings WHERE room_id = ? AND status = 'confirmed'`,
          [room.id]
        );

        for (const booking of overlappingBookings) {
          const bookingCheckIn = new Date(booking.check_in);
          const bookingCheckOut = new Date(booking.check_out);

          // Check if dates overlap
          if (!(checkOutDate <= bookingCheckIn || checkInDate >= bookingCheckOut)) {
            isAvailable = false;
            break;
          }
        }
      }

      if (isAvailable) {
        availableRooms.push({
          room,
          availability: dates.length,
          totalPrice,
        });
      }
    }

    return availableRooms;
  }

  async createRoom(data: {
    listingId: string;
    name: string;
    description?: string;
    capacity: number;
    basePrice: number;
    currency?: string;
  }) {
    const id = `room-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = Math.floor(Date.now() / 1000);

    const room = await this.db.queryOne(
      `INSERT INTO plugin_booking_rooms 
       (id, listing_id, name, description, capacity, base_price, currency, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       RETURNING *`,
      [
        id,
        data.listingId,
        data.name,
        data.description,
        data.capacity,
        data.basePrice,
        data.currency || 'USD',
        now,
        now,
      ]
    );

    return room;
  }

  async updateRoomAvailability(roomId: string, date: string, available: number, price: number) {
    const id = `avail-${roomId}-${date}`;
    const now = Math.floor(Date.now() / 1000);

    const availability = await this.db.queryOne(
      `INSERT INTO plugin_booking_room_availability (id, room_id, date, available, price, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET available = excluded.available, price = excluded.price
       RETURNING *`,
      [id, roomId, date, available, price, now]
    );

    return availability;
  }
}
