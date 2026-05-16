# iCal Export Plugin

> Exports room availability as iCal (`.ics`) feeds that can be subscribed to by Airbnb, VRBO, Google Calendar, and any other calendar application.

## What it does

- Exposes a unique iCal feed URL per room: `GET /api/ical/:token`
- Generates `VEVENT` blocks for all confirmed reservations in the next 12 months.
- Tokens are property-scoped and can be regenerated from the admin panel.

## Installation

Add to `plugin-manifest.json`:

```json
{
  "name": "ical",
  "version": "1.0.0",
  "sinaicampsVersion": ">=2.0.0",
  "path": "./plugins/ical/src/index.ts",
  "enabled": true,
  "config": {}
}
```

No additional configuration or environment variables required.

## Usage

1. Navigate to **Admin → Rooms** in the admin SPA.
2. Click a room → **iCal** tab.
3. Copy the feed URL and paste it into your OTA platform's "calendar sync" or "blocked dates import" field.

## License

MIT
