# Resource Plugin API

> ⚠️ **Plugin-Specific API**

## Base URL
```
/api/p/resource
```

## Public Endpoints

### Search Listings
```http
GET /api/public/search
```
Public search across all listings.

### List All Listings
```http
GET /api/p/resource/listings
```
Retrieve all published listings. Publicly accessible.

### Get Listing by Slug
```http
GET /api/p/resource/listings/:slug
```
Retrieve a single listing by its URL slug. Publicly accessible.

### Register Property
```http
POST /api/p/resource/register
```
Register a new property listing. Publicly accessible.

## Authenticated Endpoints

### Create Listing (Master/Marketplace Admin)
```http
POST /api/p/resource/master/listings
```
Create a new listing. Requires `master` or `marketplace_master` role.

### Update Listing (Master/Marketplace Admin)
```http
PATCH /api/p/resource/master/listings/:id
```
Update any listing by ID. Requires `master` or `marketplace_master` role.

### Manage Own Listing
```http
PATCH /api/p/resource/manage/listings/:id
```
Update a listing owned by the authenticated tenant. Requires authentication and tenant ownership check.
