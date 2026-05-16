import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomService } from '../../src/services/RoomService';

describe('RoomService', () => {
  let mockDb: any;
  let service: RoomService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
      queryOne: vi.fn(),
    };
    service = new RoomService(mockDb);
  });

  it('getRoomsByListing returns rooms', async () => {
    const rooms = [{ id: 'room-1', name: 'Tent' }];
    mockDb.query.mockResolvedValue(rooms);

    const result = await service.getRoomsByListing('listing-1');
    expect(result).toBe(rooms);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM plugin_booking_rooms WHERE listing_id = ?'),
      ['listing-1']
    );
  });

  it('getRoomById returns a room', async () => {
    const room = { id: 'room-1', name: 'Tent' };
    mockDb.queryOne.mockResolvedValue(room);

    const result = await service.getRoomById('room-1');
    expect(result).toBe(room);
  });

  it('createRoom creates and returns a room', async () => {
    const newRoom = { id: 'room-new', name: 'Tent' };
    mockDb.queryOne.mockResolvedValue(newRoom);

    const result = await service.createRoom({
      listingId: 'listing-1',
      name: 'Tent',
      capacity: 2,
      basePrice: 100,
    });

    expect(result).toBe(newRoom);
    expect(mockDb.queryOne).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO plugin_booking_rooms'),
      expect.arrayContaining(['listing-1', 'Tent', undefined, 2, 100, 'USD'])
    );
  });

  it('updateRoomAvailability upserts availability', async () => {
    const availability = { id: 'avail-room-1-2025-01-01' };
    mockDb.queryOne.mockResolvedValue(availability);

    const result = await service.updateRoomAvailability('room-1', '2025-01-01', 5, 100);
    expect(result).toBe(availability);
    expect(mockDb.queryOne).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO plugin_booking_room_availability'),
      expect.arrayContaining(['avail-room-1-2025-01-01', 'room-1', '2025-01-01', 5, 100])
    );
  });

  describe('checkAvailability', () => {
    it('returns empty array if no rooms', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await service.checkAvailability({
        listingId: 'listing-1',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03',
        adults: 2,
        children: 0,
      });

      expect(result).toEqual([]);
    });

    it('filters out rooms with insufficient capacity', async () => {
      mockDb.query.mockResolvedValue([{ id: 'room-1', capacity: 1 }]);

      const result = await service.checkAvailability({
        listingId: 'listing-1',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03',
        adults: 2,
        children: 0,
      });

      expect(result).toEqual([]);
    });

    it('filters out rooms missing availability', async () => {
      mockDb.query.mockResolvedValue([{ id: 'room-1', capacity: 2 }]);
      mockDb.queryOne.mockResolvedValue(null); // No availability found

      const result = await service.checkAvailability({
        listingId: 'listing-1',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03',
        adults: 2,
        children: 0,
      });

      expect(result).toEqual([]);
    });

    it('filters out sold out rooms', async () => {
      mockDb.query.mockResolvedValue([{ id: 'room-1', capacity: 2 }]);
      mockDb.queryOne.mockResolvedValue({ available: 0, price: 100 }); // Sold out

      const result = await service.checkAvailability({
        listingId: 'listing-1',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03',
        adults: 2,
        children: 0,
      });

      expect(result).toEqual([]);
    });

    it('filters out rooms with overlapping bookings', async () => {
      mockDb.query.mockImplementation((query: string, args: any[]) => {
        if (query.includes('plugin_booking_rooms')) {
          return Promise.resolve([{ id: 'room-1', capacity: 2 }]);
        }
        if (query.includes('plugin_booking_bookings')) {
          return Promise.resolve([
            { check_in: '2025-01-01', check_out: '2025-01-05' }, // Overlaps
          ]);
        }
        return Promise.resolve([]);
      });
      mockDb.queryOne.mockResolvedValue({ available: 1, price: 100 });

      const result = await service.checkAvailability({
        listingId: 'listing-1',
        checkIn: '2025-01-02',
        checkOut: '2025-01-04',
        adults: 2,
        children: 0,
      });

      expect(result).toEqual([]);
    });

    it('returns available rooms', async () => {
      const room = { id: 'room-1', capacity: 2 };
      mockDb.query.mockImplementation((query: string, args: any[]) => {
        if (query.includes('plugin_booking_rooms')) {
          return Promise.resolve([room]);
        }
        if (query.includes('plugin_booking_bookings')) {
          return Promise.resolve([]); // No overlapping bookings
        }
        return Promise.resolve([]);
      });
      mockDb.queryOne.mockResolvedValue({ available: 1, price: 100 });

      const result = await service.checkAvailability({
        listingId: 'listing-1',
        checkIn: '2025-01-01',
        checkOut: '2025-01-03', // 2 nights
        adults: 2,
        children: 0,
      });

      expect(result).toEqual([
        {
          room,
          availability: 2,
          totalPrice: 200, // 2 nights * 100
        },
      ]);
    });
  });
});
