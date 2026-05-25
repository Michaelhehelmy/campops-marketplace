# Inventory & Waste Plugin Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Inventory & Waste**
2. Click **Install** then **Enable**

## Tables

The plugin creates these tables automatically:

- `plugin_inventory_items` — Inventory items with name, category, unit, quantity, par_level, reorder_point, cost
- `plugin_waste_logs` — Waste records with item, quantity, unit, reason, cost; linked via FK to inventory_items

## Indexes

- `idx_inv_items_category` — Category-based queries
- `idx_waste_logs_item` — Waste logs by inventory item and date
- `idx_inv_items_low_stock` — Partial index for low stock detection
