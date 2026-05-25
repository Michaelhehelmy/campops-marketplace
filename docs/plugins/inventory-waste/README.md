# Inventory & Waste Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the Inventory and Waste plugin.

## Overview

Tracks stock levels, manages purchasing, and monitors waste for restaurant and housekeeping supplies.

## Features

- **Stock Management** — Track inventory items with name, category, unit, quantity, par level, reorder point, cost
- **Low Stock Alerts** — Partial index supports low stock queries (`WHERE quantity <= reorder_point`)
- **Waste Tracking** — Log waste with quantity, unit, reason, cost; auto-deducts from linked inventory item

## Quick Start

1. **Enable the plugin** in admin panel
2. **Add inventory items** via POST /api/p/inventory
3. **Log waste** via POST /api/p/waste

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
