# Inventory & Waste Plugin API

> ⚠️ **Plugin-Specific API** — Requires Inventory plugin to be enabled.

## Base URLs

```
/api/p/inventory  — Inventory item management
/api/p/waste      — Waste log management
```

## Inventory Endpoints

### List Items

```http
GET /api/p/inventory/
```

Returns all inventory items ordered by name.

**Response:**
```json
{
  "items": [
    {
      "id": "item-1",
      "name": "Towels",
      "category": "Housekeeping",
      "unit": "pieces",
      "quantity": 50,
      "par_level": 100,
      "reorder_point": 20,
      "cost": 5.00
    }
  ]
}
```

### Create Item

```http
POST /api/p/inventory/
```

**Request:**
```json
{
  "id": "item-1",
  "name": "Towels",
  "category": "Housekeeping",
  "unit": "pieces",
  "quantity": 50,
  "par_level": 100,
  "reorder_point": 20,
  "cost": 5.00
}
```

## Waste Endpoints

### List Waste Logs

```http
GET /api/p/waste/
```

Returns all waste logs ordered by date descending.

### Log Waste

```http
POST /api/p/waste/
```

**Request:**
```json
{
  "inventory_item_id": "item-1",
  "item": "Damaged Towel",
  "quantity": 2,
  "unit": "pieces",
  "reason": "Stained beyond use",
  "cost": 10.00
}
```

Auto-deducts `quantity` from the linked inventory item's stock.

## Hooks

This plugin does not emit or listen to any hooks.
