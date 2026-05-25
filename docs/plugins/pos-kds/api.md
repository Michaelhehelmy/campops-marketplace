# POS & KDS Plugin API

> ⚠️ **Plugin-Specific API** — These endpoints require the POS-KDS plugin to be enabled.

## Base URLs

```
/api/p/pos    — Menu/catalog endpoints
/api/p/orders — Order management endpoints
```

## Menu Endpoints

### List Menu Items

```http
GET /api/p/pos/items
```

**Response:**
```json
{
  "items": [
    {
      "id": "item-1",
      "category_id": "cat-1",
      "name": "Eggs Benedict",
      "price": 18.00,
      "is_active": 1,
      "category_name": "Breakfast"
    }
  ]
}
```

### List Categories

```http
GET /api/p/pos/categories
```

**Response:**
```json
{
  "categories": [
    {
      "id": "cat-1",
      "name": "Breakfast",
      "sort_order": 1,
      "is_active": 1
    }
  ]
}
```

## Order Endpoints

### Create Order

```http
POST /api/p/orders
```

**Request:**
```json
{
  "total": 42.00,
  "items": [
    { "itemId": "item-1", "qty": 2 }
  ]
}
```

**Response:**
```json
{
  "id": "generated-uuid",
  "order_number": "ORD-1718460000000",
  "status": "placed",
  "total": 42.00,
  "items": "[{\"itemId\":\"item-1\",\"qty\":2}]"
}
```

### List Orders

```http
GET /api/p/orders
```

**Query Parameters:**
- `status` — Filter by status (placed, preparing, ready, served, paid, void)

**Response:**
```json
{
  "orders": [
    {
      "id": "order-123",
      "order_number": "ORD-1718460000000",
      "status": "placed",
      "total": 42.00
    }
  ]
}
```

### Update Order Status

```http
PATCH /api/p/orders/:id/status
```

**Request:**
```json
{
  "status": "preparing"
}
```

## Hooks

The plugin emits:

- `pos.order_status_updated` — Emitted when order status is changed via PATCH, with `{ id, status }` payload
