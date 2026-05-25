# HR Core Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/hr
```
Auth: any valid session required.

## Endpoints

### Manage Employees
```http
GET  /api/p/hr?section=employees
POST /api/p/hr?section=employees
```

### Manage Leave Requests
```http
GET    /api/p/hr?section=leave
POST   /api/p/hr?section=leave
PATCH  /api/p/hr?section=leave
```

### Manage Timesheets
```http
GET    /api/p/hr?section=timesheets
POST   /api/p/hr?section=timesheets
PATCH  /api/p/hr?section=timesheets
```

## Hooks
- `CHECKIN_COMPLETED` — Updates staffing metrics
