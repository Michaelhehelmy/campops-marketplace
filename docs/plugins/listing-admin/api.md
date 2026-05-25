# Listing Admin Plugin API

> ⚠️ **Plugin-Specific API**

This plugin exposes **no HTTP endpoints** — it operates entirely through hooks and UI slots.

## Hooks Consumed

| Hook | Purpose |
|------|---------|
| `dashboard.get_stats` | Calculates revenue, fees, booking count, and net payout for dashboard display |

## UI Slots

Registers the **'Property Performance'** dashboard widget for property-level analytics.

## Database

This plugin does **not** create dedicated tables — it reads from core reservation and listing tables.
