# Booking Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the Booking plugin, which extends the core SinaiCamps platform.

## Overview

The Booking plugin provides complete reservation management for campsites, including room availability checking, booking creation, payment processing integration, and lifecycle management.

## Features

- **Real-time Availability**: Check room availability across date ranges
- **Real-time Availability**: Check room capacity and date-by-date availability
- **Room Inventory**: Manage room types, capacity, and pricing per date
- **Booking Lifecycle**: Pending → Confirmed → Checked-in → Checked-out
- **Check-in/Check-out**: Staff-managed check-in and check-out workflows
- **Hook System**: Emits BOOKING_CREATED, CHECKIN_COMPLETED, CHECKOUT_COMPLETED hooks

## Quick Start

1. **Enable the plugin** in your tenant admin panel
2. **Configure room types** in the property settings
3. **Set pricing** and availability rules
4. **Add booking widget** to your public site

## Database Schema

### Tables Created

- `plugin_booking_bookings` — Booking records
- `plugin_booking_rooms` — Room types per listing
- `plugin_booking_room_availability` — Per-date room availability with price

### Indexes

- `idx_bookings_listing_checkin` — Fast availability queries
- `idx_bookings_listing_status` — Status-based filtering
- `idx_bookings_guest_email` — Guest lookup
- `idx_avail_room_date` — Availability by room and date

## Related Documentation

- [API Reference](./api.md) — Complete API documentation
- [Configuration Guide](./configuration.md) — Setup and settings
- [User Guide](./user-guide.md) — How to use the booking system
- [Plugin Development Guide](../plugin-development.md) — Extending the plugin
