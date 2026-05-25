# Resource Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Resource**
2. Click **Install** then **Enable**

## Database

Creates `plugin_resource_listings` table for managing property/listing records.

## Hook Events Emitted

| Event | When |
|-------|------|
| `LISTING_CREATED` | A new listing is created |
| `LISTING_UPDATED` | An existing listing is updated |
| `PROPERTY_REGISTERED` | A property is registered via the public endpoint |

Events are emitted via `api.hooks.executeHook`.

## UI Slots

The plugin registers 5 UI slot components:

| Slot ID | Component | Purpose |
|---------|-----------|---------|
| `FeaturedListings` | FeaturedListings | Display featured listings on public pages |
| `SearchBar` | SearchBar | Listing search interface |
| `ListingDetail` | ListingDetail | Individual listing detail view |
| `MasterListingsTable` | MasterListingsTable | Admin master listings management |
| `AdminEditForm` | AdminEditForm | Listing editing form for admins |
```
