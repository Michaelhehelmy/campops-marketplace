# PWA Plugin API

> ⚠️ **Plugin-Specific API**

This plugin exposes **no HTTP endpoints** — it operates through UI slots and hooks.

## Hooks Consumed

| Hook | Purpose |
|------|---------|
| `listing.public_page_loaded` | Page-view analytics tracking |

## Database Tables

| Table | Purpose |
|-------|---------|
| `plugin_pwa_settings` | Stores PWA configuration and manifest settings |
| `plugin_pwa_subscriptions` | Stores push notification subscriptions |

## UI Slots

The plugin registers the following UI components:

| Slot ID | Component | Placement |
|---------|-----------|-----------|
| `listing.header` | PWAInstallBanner | Listing detail page header |
| `dashboard.top` | PWAInstallBanner | Dashboard top area |
| — | PWAInstallButton | Standalone install button |
| — | PWASettingsPage | PWA settings administration page |
