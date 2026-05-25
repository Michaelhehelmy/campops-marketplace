# POS & KDS Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the POS (Point of Sale) and KDS (Kitchen Display System) plugin, which extends the core SinaiCamps platform.

## Overview

The POS-KDS plugin provides a complete restaurant and retail point of sale system with kitchen order management. It handles menu items, orders, payments, and kitchen workflow.

## Features

- **Menu Management** — Categories and items with pricing
- **Order Management** — Create, list, update order status
- **Kitchen Display** — Status-driven order queue

## Quick Start

1. **Enable the plugin** in admin panel
2. **Configure menu categories** and items
3. **Start taking orders**

## Database Schema

### Tables

- `plugin_pos_categories` — Menu categories (id, name, sort_order, is_active)
- `plugin_pos_items` — Menu items with pricing (id, category_id FK, name, price, is_active)
- `plugin_pos_orders` — Order records (id, order_number, status, total, items JSON)

### Indexes

- `idx_pos_orders_status_date` — Order queue queries
- `idx_pos_items_category` — Category lookup queries

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [User Guide](./user-guide.md)
