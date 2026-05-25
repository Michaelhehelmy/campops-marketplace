# Booking Plugin API Reference

> ⚠️ **Plugin-Specific API** — These endpoints are provided by the Booking plugin and require the plugin to be enabled.

## Base URL

The booking plugin registers routes under multiple paths depending on the operation.

## Availability

### Check Availability

```http
POST /api/p/booking/check-availability
```

Check room availability for a date range. Public (no auth required).

**Request Body:**
```json
{
  "listingId": "123",
  "checkIn": "2024-06-15",
  "checkOut": "2024-06-17",
  "adults": 2,
  "children": 0
}
```

### Create Booking

```http
POST /api/p/booking/book
```

Create a new booking. Public (no auth required). Supports idempotency key.

**Request Body:**
```json
{
  "listingId": "123",
  "roomId": "room-1",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890",
  "checkIn": "2024-06-15",
  "checkOut": "2024-06-17",
  "adults": 2,
  "children": 0,
  "specialRequests": "Late check-in",
  "paymentProvider": "pay_later"
}
```

### Check-in

```http
PATCH /api/p/booking/:id/check-in
```

Mark a booking as checked in. Requires `master`, `admin`, or `staff` role.

**Request Body:**
```json
{
  "bookingId": "bk-12345"
}
```

### Check-out

```http
PATCH /api/p/booking/:id/check-out
```

Mark a booking as checked out. Requires `master`, `admin`, or `staff` role.

**Request Body:**
```json
{
  "bookingId": "bk-12345"
}
```

### List Bookings

```http
GET /api/p/bookings
```

List bookings with filters. Authenticated; guests see only their own bookings.

**Query Parameters:**
- `listingId` — Filter by listing
- `roomId` — Filter by room
- `status` — Filter by status (pending, confirmed, checked_in, checked_out, cancelled)
- `limit` — Number of results (default: 50, max: 100)
- `offset` — Pagination offset

## Legacy Routes

### Manage Bookings

```http
GET /api/manage/:listingId/bookings
POST /api/manage/:listingId/bookings
PATCH /api/manage/:listingId/bookings
```

Legacy CRUD operations on the `reservations` table.

### Manage Rooms

```http
GET /api/manage/:listingId/rooms
POST /api/manage/:listingId/rooms
```

Legacy room type management on the `room_types` table.

### Guest Reservations

```http
GET /api/guest/reservations
GET /api/guest/reservations/:id
```

Authenticated guest reservation lookup.

## Hooks

The booking plugin emits these hooks via `api.executeHook`:

- `BOOKING_CREATED` — New booking created via POST /api/p/booking/book
- `CHECKIN_COMPLETED` — Guest checked in via PATCH /api/p/booking/:id/check-in
- `CHECKOUT_COMPLETED` — Guest checked out via PATCH /api/p/booking/:id/check-out

Hooks are also registered in `hooks.ts` for internal use.

## Error Codes

| Code | Description |
|------|-------------|
| `ROOM_UNAVAILABLE` | Selected room not available for dates |
| `INVALID_DATES` | Check-in must be before check-out |
| `BOOKING_NOT_FOUND` | Booking ID does not exist |
