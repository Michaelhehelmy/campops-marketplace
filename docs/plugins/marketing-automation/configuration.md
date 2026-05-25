# Marketing Automation Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Marketing Automation**
2. Click **Install** then **Enable**

This plugin has no runtime configuration options. Automation triggers are created and managed via the API's `?section=triggers` endpoint. The plugin listens for `BOOKING_CREATED` and checks if any active trigger in the database matches the `booking.created` event.
