# OTA Channel Manager Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → OTA Channel Manager**
2. Click **Install** then **Enable**

## Tables

This plugin creates the table `external_calendars` in the core database (unprefixed, via migration) with columns: id, room_id, name, url, created_at, updated_at.

## Indexes

- `idx_external_calendars_room_id` — Room-based calendar lookups
