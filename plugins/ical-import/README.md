# iCal Import Plugin

> Subscribes to external iCal feeds (from Airbnb, VRBO, Booking.com, etc.) and automatically creates block reservations to prevent double-bookings.

## What it does

- Syncs external calendars on a scheduled interval (default: every hour).
- Creates `blocked` reservations in the SinaiCamps database for each `VEVENT` found.
- Removes blocks automatically when events disappear from the external feed.
- Supports multiple feeds per room.

## Installation

Add to `plugin-manifest.json`:

```json
{
  "name": "ical-import",
  "version": "1.0.0",
  "sinaicampsVersion": ">=2.0.0",
  "path": "./plugins/ical-import/src/index.ts",
  "enabled": true,
  "config": {
    "SYNC_INTERVAL_MINUTES": "60"
  }
}
```

## Configuration

| Key                     | Required | Default | Description                      |
| ----------------------- | -------- | ------- | -------------------------------- |
| `SYNC_INTERVAL_MINUTES` | —        | `60`    | How often to poll external feeds |

## Adding a feed

1. Navigate to **Admin → Rooms** → select a room → **External Calendars** tab.
2. Paste the iCal URL from your OTA (e.g., Airbnb → Availability → Export Calendar).
3. Save. The plugin will sync within the next interval cycle.

You can also trigger an immediate sync:

```bash
npm run ota:sync
```

## License

MIT
