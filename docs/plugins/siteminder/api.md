# SiteMinder Plugin API

> ⚠️ **Plugin-Specific API**

This plugin is an **OTA adapter** — it exposes no HTTP endpoints.

## OTA Adapter

| Property | Value |
|----------|-------|
| **ID** | `siteminder` |
| **Name** | SiteMinder |
| **Type** | OTAAdapter |

## Adapter Methods

The adapter provides integration with the SiteMinder channel manager through adapter methods:

- **Inventory Sync** — Sync room/unit availability
- **Rate Sync** — Update pricing and rate plans
- **Reservation Fetch** — Retrieve new reservations from SiteMinder
- **Cancellation** — Process booking cancellations

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SITEMINDER_API_KEY` | API key for SiteMinder authentication |
| `SITEMINDER_HOTEL_ID` | Hotel/property identifier in SiteMinder |
| `SITEMINDER_BASE_URL` | Base URL for SiteMinder API endpoints |

## Webhooks
SiteMinder sends:
- Booking notifications
- Modification alerts
- Cancellation notices
