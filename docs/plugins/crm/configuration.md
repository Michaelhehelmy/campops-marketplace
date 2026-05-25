# CRM Plugin Configuration

> ⚠️ **Plugin-Specific Configuration** — Settings for the CRM plugin.

## Enabling the Plugin

1. Go to **Admin → Plugins → CRM**
2. Click **Install** then **Enable**

## Integration

The CRM plugin listens to `BOOKING_CREATED` events and logs them as activities. No additional configuration is required.

## Hooks

| Hook | Listener Priority | Behavior |
|------|------------------|----------|
| `BOOKING_CREATED` | default | Inserts a row into `plugin_crm_activities` with guest email, activity type, and booking details |
