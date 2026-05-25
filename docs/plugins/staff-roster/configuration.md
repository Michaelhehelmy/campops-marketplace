# Staff Roster Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Staff Roster**
2. Click **Install** then **Enable**

## Tables

This plugin does not create any plugin-specific tables. It uses core tables:
- `staff_shifts` — Shift records
- `property_staff` — Staff-to-property assignments
- `users` / `profiles` — User information

## Shifts

Shifts are stored in the `staff_shifts` core table with fields: user_id, shift_start, shift_end, role, notes.
