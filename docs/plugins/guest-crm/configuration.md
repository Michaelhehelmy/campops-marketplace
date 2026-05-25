# Guest CRM Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Guest CRM**
2. Click **Install** then **Enable**

## Data Model

This plugin does **not** create dedicated database tables. It operates on core `users` and `reservations` tables to provide guest profile and segment views.

## Hooks

- Listens to `reservations.after_create` — updates guest profile data when a reservation is created.
```
