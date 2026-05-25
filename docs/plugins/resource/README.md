# Resource Plugin

> ⚠️ **Plugin-Specific Documentation** — Resource plugin.

## Overview

Property listing management plugin — create, search, and manage campsite and accommodation listings with role-based access control.

## Features

- **Listing Management** — Full CRUD for property listings
- **Public Search** — Searchable listing catalog at `/api/public/search`
- **Slug-Based URLs** — Friendly URL slugs for each listing
- **Role-Based Access** — Master/marketplace admin management vs. tenant self-service
- **Public Registration** — Property owners can register their own listings
- **Hook Events** — Emits LISTING_CREATED, LISTING_UPDATED, PROPERTY_REGISTERED
- **UI Slots** — 5 slot components (FeaturedListings, SearchBar, ListingDetail, MasterListingsTable, AdminEditForm)

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
