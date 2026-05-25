# Activities Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/activities
```
**No authentication** — endpoints are publicly accessible.

## Endpoints

### List Activities
```http
GET /api/p/activities
```
Returns all activities.

### Create Activity
```http
POST /api/p/activities
```
Creates a new activity.

### Fields

| Column | Type | Description |
|--------|------|-------------|
| `type` | text | Activity type (e.g., hiking, kayaking) |
| `title` | text | Display name |
| `date` | text | Activity date |
| `price` | real | Cost per participant |
| `capacity` | integer | Max participants |

> **Note:** The table name `activities` has no plugin prefix — this may be a bug in the current implementation.
