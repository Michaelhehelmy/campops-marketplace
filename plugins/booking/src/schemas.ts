import { z } from 'zod';

/**
 * Booking Plugin Zod Validation Schemas
 * ────────────────────────────────────
 * All API inputs must be validated with Zod
 */

// Check availability request
export const checkAvailabilitySchema = z.object({
  listingId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).default(2),
  children: z.number().int().min(0).default(0),
});

// Create booking request
export const createBookingSchema = z.object({
  listingId: z.string().min(1),
  roomId: z.string().min(1),
  guestName: z.string().min(1).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).default(2),
  children: z.number().int().min(0).default(0),
  specialRequests: z.string().optional(),
  paymentProvider: z.enum(['stripe', 'paypal', 'pay_later']).default('pay_later'),
});

// Check-in request
export const checkInSchema = z.object({
  bookingId: z.string().min(1),
});

// Check-out request
export const checkOutSchema = z.object({
  bookingId: z.string().min(1),
});

// Get bookings request
export const getBookingsSchema = z.object({
  listingId: z.string().optional(),
  roomId: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type GetBookingsInput = z.infer<typeof getBookingsSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
