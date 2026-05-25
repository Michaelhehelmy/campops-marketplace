# Marketplace API

## Overview

Public endpoints for browsing and searching marketplace listings. No authentication required.

## Endpoints

### GET /api/public/platform-settings

Returns global platform configuration for the UI.

**Response (200):**
```json
{
  "platformName": "SinaiCamps Marketplace",
  "supportEmail": "support@sinaicamps.com",
  "currency": "USD",
  "timezone": "UTC"
}
```

**Example:**
```bash
curl https://sinaicamps.com/api/public/platform-settings
```

### GET /api/public/search

Search across all active marketplace properties.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | No | Full-text search query |
| location | string | No | City or region filter |
| checkIn | date | No | Check-in date (YYYY-MM-DD) |
| checkOut | date | No | Check-out date (YYYY-MM-DD) |
| guests | integer | No | Number of guests (min 1) |
| limit | integer | No | Results per page (max 100, default 20) |
| offset | integer | No | Pagination offset |

**Response (200):**
```json
{
  "items": [
    {
      "id": "prop-1",
      "slug": "sunrise-resort",
      "name": "Sunrise Desert Resort",
      "city": "Dahab",
      "country": "Egypt",
      "primaryImage": "https://images.sinaicamps.com/sunrise-hero.jpg",
      "pricePerNight": 15000,
      "currencyCode": "EGP",
      "rating": 4.8,
      "isFeatured": true
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

**Example:**
```bash
curl "https://sinaicamps.com/api/public/search?location=Dahab&checkIn=2026-06-01&checkOut=2026-06-05&guests=2"
```

### GET /api/properties/:id

Get full property details.

**Response (200):**
```json
{
  "id": "prop-1",
  "slug": "sunrise-resort",
  "name": "Sunrise Desert Resort",
  "description": "Luxury desert resort with stunning Sinai mountain views...",
  "shortDescription": "Premium desert experience",
  "city": "Dahab",
  "country": "Egypt",
  "isActive": true,
  "isFeatured": true,
  "primaryImage": "https://images.sinaicamps.com/sunrise-hero.jpg",
  "amenities": "Pool, WiFi, Breakfast, AC, Parking",
  "pricePerNight": 15000,
  "currencyCode": "EGP",
  "rating": 4.8,
  "branding": {
    "primaryColor": "#C4956A",
    "logo": "https://images.sinaicamps.com/sunrise-logo.png"
  },
  "settings": {
    "timezone": "Africa/Cairo",
    "checkInTime": "14:00",
    "checkOutTime": "11:00"
  }
}
```

### GET /api/tenant/resolve

Resolve tenant by subdomain or custom domain.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| host | string | No | Full hostname (e.g., `sunrise.sinaicamps.com`) |
| subdomain | string | No | Subdomain only (e.g., `sunrise-resort`) |

**Response (200):**
```json
{
  "id": "tenant-456",
  "slug": "sunrise-resort",
  "subdomain": "sunrise-resort",
  "customDomain": "sunriseresort.com",
  "plan": "ultimate",
  "name": "Sunrise Desert Resort",
  "ownerId": "user-789",
  "isActive": true,
  "settings": {
    "currency": "EGP",
    "timezone": "Africa/Cairo",
    "language": "en"
  },
  "branding": {
    "logo": "https://images.sinaicamps.com/sunrise-logo.png",
    "colors": { "primary": "#C4956A", "secondary": "#2D5016" }
  }
}
```

**Note:** Basic plan tenants return 404 on subdomain/custom domain access.
