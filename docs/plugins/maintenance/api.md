# Maintenance Plugin API

> ⚠️ **Plugin-Specific API** — These endpoints require the Maintenance plugin to be enabled.

## Base URL

```
/api/p/maintenance
```

## Endpoints

### List Requests

```http
GET /api/p/maintenance
```

**Query Parameters:**
- `status` — open, in_progress, completed, cancelled
- `priority` — emergency, urgent, normal, low
- `assigned_to` — Staff user ID

**Response:**
```json
{
  "requests": [
    {
      "id": "maint-123",
      "title": "AC not cooling in Tent 5",
      "description": "Guest reported AC blowing warm air",
      "status": "open",
      "priority": "urgent",
      "location": "room-5",
      "assigned_to": null,
      "reported_by": "user-1",
      "created_at": "2024-06-15T14:30:00Z",
      "updated_at": "2024-06-15T14:30:00Z"
    }
  ]
}
```

### Create Request

```http
POST /api/p/maintenance
```

**Request:**
```json
{
  "title": "Leaky faucet in bathroom",
  "description": "Drip is constant, guest complained",
  "location": "room-3",
  "priority": "normal"
}
```

**Response:**
```json
{
  "id": "generated-uuid",
  "status": 201
}
```

### Update Request

```http
PATCH /api/p/maintenance?id=maint-123
```

Uses `?id=` query parameter (not path).

**Request:**
```json
{
  "status": "in_progress",
  "assigned_to": "maint-staff-1"
}
```

## Hooks

This plugin does not emit or listen to any hooks.
