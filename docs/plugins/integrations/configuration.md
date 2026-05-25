# Integrations Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Integrations**
2. Click **Install** then **Enable**

## Database Tables

| Table | Purpose |
|-------|---------|
| `plugin_integrations_external_calendars` | Stores connected external calendars |
| `plugin_integrations_integration_logs` | Logs of sync operations |

## Hooks

The plugin listens to:
- `BOOKING_CREATED` — triggers calendar sync on new booking
- `BOOKING_CANCELLED` — triggers calendar sync on cancellation
```
