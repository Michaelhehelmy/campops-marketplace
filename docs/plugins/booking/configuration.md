# Booking Plugin Configuration

> ⚠️ **Plugin-Specific Configuration** — These settings apply only when the Booking plugin is enabled.

## Enabling the Plugin

1. Navigate to **Admin → Plugins**
2. Find "Booking" in the available plugins list
3. Click **Install** then **Enable**
4. Configure settings below

## Required Settings

### Property Configuration

Each property must configure:

- **Room Types**: Define room categories (tent, cabin, RV spot, etc.)
- **Inventory**: Number of rooms per type
- **Base Pricing**: Default rates per night
- **Amenities**: Features available in each room type

### Booking Rules

Configure in **Property Settings → Booking**:

```typescript
{
  // Minimum advance booking (hours)
  minAdvanceBooking: 24,
  
  // Maximum advance booking (days)
  maxAdvanceBooking: 365,
  
  // Default check-in time
  checkInTime: "15:00",
  
  // Default check-out time
  checkOutTime: "11:00",
  
  // Cancellation policy
  cancellationPolicy: {
    // Hours before check-in for full refund
    fullRefundHours: 48,
    // Hours before check-in for partial refund
    partialRefundHours: 24,
    // Partial refund percentage
    partialRefundPercent: 50
  },
  
  // Hold inventory duration (minutes)
  holdDurationMinutes: 15
}
```

## Optional Settings

### Payment Integration

The booking plugin integrates with payment processors:

```typescript
{
  // Payment processor (requires separate plugin)
  paymentProcessor: "paymob",
  
  // Currency for bookings
  defaultCurrency: "USD",
  
  // Accepted currencies
  acceptedCurrencies: ["USD", "EUR", "EGP"],
  
  // Require payment to confirm
  requirePaymentToConfirm: true,
  
  // Deposit percentage (if partial payment allowed)
  depositPercent: 25
}
```

### Email Notifications

Enable automatic emails:

```typescript
{
  notifications: {
    bookingConfirmation: true,
    checkInReminder: true, // 24h before
    checkOutReminder: true, // Morning of checkout
    cancellationConfirmation: true
  }
}
```

### Seasonal Pricing

Set different rates for seasons:

```typescript
{
  seasonalPricing: [
    {
      name: "Peak Season",
      startMonth: 6, // June
      endMonth: 8,   // August
      multiplier: 1.5 // 50% increase
    },
    {
      name: "Low Season",
      startMonth: 11,
      endMonth: 2,
      multiplier: 0.8 // 20% discount
    }
  ]
}
```

## Database Configuration

### Custom Tables

The plugin creates these tables automatically on enable:

- `plugin_booking_bookings` — Booking records
- `plugin_booking_rooms` — Room types per listing
- `plugin_booking_room_availability` — Per-date availability with pricing

### Indexes

Indexes are automatically created for performance:

```sql
-- Booking lookups by listing and dates
CREATE INDEX idx_bookings_listing_checkin 
ON plugin_booking_bookings(listing_id, check_in);

-- Status-based queries
CREATE INDEX idx_bookings_listing_status 
ON plugin_booking_bookings(listing_id, status);

-- Guest email search
CREATE INDEX idx_bookings_guest_email 
ON plugin_booking_bookings(guest_email);

-- Availability queries
CREATE INDEX idx_avail_room_date 
ON plugin_booking_room_availability(room_id, date);

-- Additional indexes for booking queries
CREATE INDEX idx_bookings_dates 
ON plugin_booking_bookings(check_in, check_out);
```

## Environment Variables

Optional environment configuration:

```bash
# Booking hold duration (seconds, default: 900 = 15 min)
BOOKING_HOLD_DURATION=900

# Max bookings per property (default: unlimited)
BOOKING_MAX_PER_PROPERTY=1000

# Enable booking analytics
BOOKING_ANALYTICS_ENABLED=true
```

## Hook Integration

The booking plugin emits hooks that other plugins can listen to:

```typescript
// Example: CRM plugin listening for bookings
api.registerHook('BOOKING_CREATED', async (data) => {
  // Create guest record in CRM
  await crm.createGuestActivity({
    email: data.guestEmail,
    type: 'booking',
    bookingId: data.bookingId,
    amount: data.totalAmount
  });
});
```

## Troubleshooting

### Bookings Not Showing

1. Verify plugin is **enabled** for the property
2. Check room inventory is configured
3. Ensure pricing is set (bookings require valid prices)

### Availability Check Fails

1. Verify room availability table exists: `SELECT * FROM plugin_booking_room_availability LIMIT 1`
2. Check date ranges (must be future dates)
3. Verify room inventory > 0

### Payment Integration Issues

1. Ensure Paymob plugin is installed and enabled
2. Verify Paymob API keys in environment
3. Check payment webhook URL is accessible

## Migration Notes

When migrating from another booking system:

1. Export existing bookings in CSV format
2. Use bulk import API: `POST /api/p/booking/import`
3. Map your status values to SinaiCamps statuses
4. Test availability after import
