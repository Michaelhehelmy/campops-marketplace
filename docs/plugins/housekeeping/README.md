# Housekeeping Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the Housekeeping plugin, which extends the core SinaiCamps platform.

## Overview

The Housekeeping plugin manages cleaning schedules, room maintenance tasks, and staff assignments for properties. It automatically creates cleaning tasks when guests check out and tracks task completion status.

## Features

- **Automatic Task Creation** — Generates cleaning tasks on guest checkout via `reservations.after_checkout` hook
- **Task Management** — List and update task status (pending/in_progress/completed)
- **Priority Levels** — Urgent, high, normal, low (actual code only checks priority field)
- **Status Tracking** — Tracks task completion with status field
- **Hook Integration** — Listens to `reservations.after_checkout` for auto task creation

## Quick Start

1. **Enable the plugin** in admin panel
2. **Configure staff** with housekeeping role
3. **Set room priorities** (VIP rooms, standard, etc.)
4. **View dashboard** for today's tasks

## Database Schema

### Tables

- `plugin_housekeeping_tasks` — Cleaning tasks (id, room_id, category, status, priority, assigned_to, notes, timestamps)

### Indexes

- `idx_hk_tasks_room_status` — Room and status queries
- `idx_hk_tasks_assigned` — Staff workload queries
- `idx_hk_tasks_status_priority` — Task queue ordering

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [User Guide](./user-guide.md)
