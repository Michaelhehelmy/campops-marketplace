import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from '../../src/services/BookingService';

describe('BookingService', () => {
  let mockDb: any;
  let service: BookingService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      queryOne: vi.fn(),
      transaction: vi.fn(async (cb) => cb(mockDb)),
    };
    service = new BookingService(mockDb);
  });

  describe('createBooking', () => {
    it('creates a booking successfully', async () => {
      mockDb.queryOne
        .mockResolvedValueOnce({ id: 'room-1', base_price: 100, currency: 'USD' }) // Room
        .mockResolvedValueOnce({ id: 'booking-1' }); // Insert result

      const result = await service.createBooking({
        listingId: 'listing-1',
        roomId: 'room-1',
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03', // 2 nights
        adults: 2,
        children: 0,
      });

      expect(result).toEqual({ id: 'booking-1' });

      // Verify room check
      expect(mockDb.queryOne).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT * FROM plugin_booking_rooms'),
        ['room-1']
      );

      // Verify insert
      expect(mockDb.queryOne).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO plugin_booking_bookings'),
        expect.arrayContaining([
          'listing-1',
          'room-1',
          'John Doe',
          'john@example.com',
          undefined,
          '2025-01-01',
          '2025-01-03',
          2,
          0,
          200,
          'USD',
          'confirmed',
          undefined,
          undefined,
          'pending',
        ])
      );
    });

    it('throws if room is not found', async () => {
      mockDb.queryOne.mockResolvedValueOnce(null);

      await expect(
        service.createBooking({
          listingId: 'listing-1',
          roomId: 'room-1',
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          checkIn: '2025-01-01',
          checkOut: '2025-01-03',
          adults: 2,
          children: 0,
        })
      ).rejects.toThrow('Room not found');
    });
  });

  describe('getBookings', () => {
    it('returns all bookings with no filters', async () => {
      mockDb.query.mockResolvedValue([{ id: 'booking-1' }]);
      const result = await service.getBookings();
      expect(result).toEqual([{ id: 'booking-1' }]);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM plugin_booking_bookings ORDER BY created_at DESC',
        []
      );
    });

    it('applies filters', async () => {
      mockDb.query.mockResolvedValue([{ id: 'booking-1' }]);
      await service.getBookings({
        listingId: 'listing-1',
        roomId: 'room-1',
        status: 'confirmed',
        guestEmail: 'test@test.com',
        limit: 10,
        offset: 5,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /SELECT \* FROM plugin_booking_bookings WHERE listing_id = \? AND room_id = \? AND status = \? AND guest_email = \? ORDER BY created_at DESC LIMIT 10 OFFSET 5/
        ),
        ['listing-1', 'room-1', 'confirmed', 'test@test.com']
      );
    });
  });

  describe('getBookingById', () => {
    it('returns a booking', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'booking-1' });
      const result = await service.getBookingById('booking-1');
      expect(result).toEqual({ id: 'booking-1' });
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM plugin_booking_bookings WHERE id = ?'),
        ['booking-1']
      );
    });
  });

  describe('checkIn', () => {
    it('updates status to checked_in', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'booking-1', status: 'checked_in' });
      const result = await service.checkIn({ bookingId: 'booking-1' });
      expect(result.status).toBe('checked_in');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'checked_in'"),
        expect.arrayContaining(['booking-1'])
      );
    });

    it('throws if booking not found', async () => {
      mockDb.queryOne.mockResolvedValue(null);
      await expect(service.checkIn({ bookingId: 'booking-1' })).rejects.toThrow(
        'Booking not found'
      );
    });
  });

  describe('checkOut', () => {
    it('updates status to checked_out', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'booking-1', status: 'checked_out' });
      const result = await service.checkOut({ bookingId: 'booking-1' });
      expect(result.status).toBe('checked_out');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'checked_out'"),
        expect.arrayContaining(['booking-1'])
      );
    });

    it('throws if booking not found', async () => {
      mockDb.queryOne.mockResolvedValue(null);
      await expect(service.checkOut({ bookingId: 'booking-1' })).rejects.toThrow(
        'Booking not found'
      );
    });
  });

  describe('cancelBooking', () => {
    it('updates status to cancelled', async () => {
      mockDb.queryOne.mockResolvedValue({ id: 'booking-1', status: 'cancelled' });
      const result = await service.cancelBooking('booking-1');
      expect(result.status).toBe('cancelled');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'cancelled'"),
        expect.arrayContaining(['booking-1'])
      );
    });

    it('throws if booking not found', async () => {
      mockDb.queryOne.mockResolvedValue(null);
      await expect(service.cancelBooking('booking-1')).rejects.toThrow('Booking not found');
    });
  });
});
