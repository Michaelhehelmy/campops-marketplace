# Admin & Management API

## Overview

Endpoints for platform administration and property management. All require authentication and appropriate role.

## Master Admin Endpoints

### GET /api/master/settings

Get platform-wide settings.

**Required Role:** `marketplace_master`

**Response (200):**
```json
{
  "platformName": "SinaiCamps Marketplace",
  "supportEmail": "support@sinaicamps.com",
  "currency": "USD",
  "timezone": "UTC",
  "commissionRate": 10.0,
  "minBookingFee": 1.5
}
```

### POST /api/master/settings

Update platform-wide settings.

**Required Role:** `marketplace_master`

**Request Body:**
```json
{
  "platformName": "SinaiCamps Marketplace",
  "supportEmail": "support@sinaicamps.com",
  "commissionRate": 12.0
}
```

Uses COALESCE-based partial update — only provided fields are changed.

### GET /api/master/listings

List all properties across the platform.

**Required Role:** `marketplace_master`

**Query Parameters:** `limit`, `offset`, `status`, `plan`

### POST /api/master/listings

Create a new property (tenant provisioning).

### PATCH /api/master/listings/:id

Update any property.

### DELETE /api/master/listings/:id

Delete a property and all associated data.

### POST /api/admin/impersonate

Login as a property owner (master-only).

**Required Role:** `marketplace_master`

**Request Body:**
```json
{
  "propertyId": "prop-1"
}
```

Sets a `sinaicamps_impersonating` cookie (non-httpOnly, 30min). The master is then routed to `/manage/{slug}` instead of `/admin`.

### POST /api/admin/impersonate/stop

Clear impersonation session.

## Property Manager Endpoints

### GET /api/owner/me

Get the current property manager's profile and property data.

**Required Role:** `manager-tenant`

**Response (200):**
```json
{
  "user": { "id": "user-123", "email": "owner@example.com", "name": "John Doe" },
  "property": {
    "id": "prop-1",
    "name": "Sunrise Desert Resort",
    "slug": "sunrise-resort",
    "subdomain": "sunrise-resort",
    "customDomain": "sunriseresort.com",
    "domainVerified": true,
    "plan": "ultimate",
    "branding": { "primaryColor": "#C4956A", "secondaryColor": "#2D5016" },
    "settings": { "timezone": "Africa/Cairo" }
  },
  "impersonating": false
}
```

When a master is impersonating, `impersonating: true` is returned with the impersonated property data.

### POST /api/owner/upgrade

Upgrade tenant plan.

**Required Role:** `manager-tenant`

**Request Body:**
```json
{
  "newPlan": "premium",
  "subdomain": "sunrise-resort"
}
```

Valid plan chain: `basic → premium → ultimate`. Validates subdomain uniqueness.

### POST /api/owner/domains/check

Check custom domain availability and DNS configuration.

**Required Role:** `manager-tenant`

**Request Body:**
```json
{
  "domain": "sunriseresort.com"
}
```

**Note:** Only Ultimate plan tenants can set custom domains.

### PATCH /api/properties/:id

Update property details including branding.

**Required Role:** `manager-tenant` (own property) or `marketplace_master`

**Request Body:**
```json
{
  "name": "Sunrise Desert Resort",
  "branding": {
    "primaryColor": "#C4956A",
    "secondaryColor": "#2D5016",
    "logo": "https://images.sinaicamps.com/sunrise-logo.png",
    "font": "Inter"
  }
}
```

### GET /api/manage/:listingId/plugins

List enabled plugins for a property.

### POST /api/manage/:listingId/plugins/toggle

Enable or disable a plugin.

## Pagination

All list endpoints support pagination:

| Parameter | Default | Max |
|-----------|---------|-----|
| `limit` | 20 | 100 |
| `offset` | 0 | — |

**Paginated Response Shape:**
```json
{
  "items": [...],
  "total": 142,
  "limit": 20,
  "offset": 0
}
```

## Rate Limiting

| Prefix | Rate | Burst |
|--------|------|-------|
| `/api/manage/*` | 30 req/s | 20 |
| `/api/auth/*` | 10 req/s | 5 |
| `/api/public/*` | 30 req/s | 30 |

Rate limit headers are returned on every response:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1704067500
```
