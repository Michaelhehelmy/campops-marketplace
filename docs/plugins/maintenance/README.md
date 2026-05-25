# Maintenance Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the Maintenance plugin, which extends the core SinaiCamps platform.

## Overview

The Maintenance plugin tracks repair requests, schedules preventive maintenance, and manages work orders for property assets and guest rooms.

## Features

- **Work Order Management** — Create, list, and update maintenance requests
- **Priority Levels** — open/in_progress/completed/cancelled statuses
- **Dynamic Filtering** — Filter by status, priority, assigned_to
- **Staff Assignment** — Assign to maintenance team members via PATCH

## Quick Start

1. **Enable the plugin** in admin panel
2. **Configure maintenance categories**
3. **Add maintenance staff**
4. **Start creating work orders**

## Database Schema

### Tables

- `plugin_maintenance_requests` — Maintenance work orders (id, title, description, location, priority, status, assigned_to, reported_by, timestamps)

### Indexes

- `idx_maintenance_status_priority` — Task queue ordering
- `idx_maintenance_assigned` — Staff workload queries

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [User Guide](./user-guide.md)
