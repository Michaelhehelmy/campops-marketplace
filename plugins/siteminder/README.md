# SiteMinder Plugin

> OTA channel manager adapter — two-way sync of inventory, rates, and reservations between SinaiCamps and SiteMinder.

## What it does

- Pushes room availability and rate updates to SiteMinder when inventory changes.
- Fetches new reservations from SiteMinder on a scheduled interval.
- Fires `ota.reservation_received` hooks for each imported booking so other plugins can react.
- Supports reservation cancellation propagation (SinaiCamps → SiteMinder).

## Installation

Add to `plugin-manifest.json`:

```json
{
  "name": "siteminder",
  "version": "1.0.0",
  "sinaicampsVersion": ">=2.0.0",
  "path": "./plugins/siteminder/src/index.ts",
  "enabled": true,
  "config": {
    "API_KEY": "${SITEMINDER_API_KEY}",
    "PROPERTY_ID": "${SITEMINDER_PROPERTY_ID}",
    "SYNC_INTERVAL_MINUTES": "30"
  }
}
```

Add to `.env`:

```env
SITEMINDER_API_KEY=your-siteminder-key
SITEMINDER_PROPERTY_ID=your-siteminder-property-id
```

## Configuration

| Key                     | Required | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| `API_KEY`               | ✅       | SiteMinder API key from your SiteMinder account |
| `PROPERTY_ID`           | ✅       | SiteMinder property ID                          |
| `SYNC_INTERVAL_MINUTES` | —        | How often to pull reservations (default: 30)    |

## Room mapping

Before the plugin can sync, you must map SinaiCamps room types to SiteMinder room type codes:

1. Navigate to **Admin → OTA → SiteMinder** in the admin panel.
2. For each room type, enter the corresponding SiteMinder room code.
3. Save mappings.

## License

MIT
