# PWA Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → PWA**
2. Click **Install** then **Enable**

## Database Tables

| Table | Purpose |
|-------|---------|
| `plugin_pwa_settings` | Stores PWA configuration and manifest settings |
| `plugin_pwa_subscriptions` | Stores push notification subscriptions |

## Hook

Listens to `listing.public_page_loaded` for page-view analytics.

## UI Components

| Component | Purpose |
|-----------|---------|
| **PWAInstallBanner** | Prompts PWA install (placed in `listing.header` and `dashboard.top` slots) |
| **PWAInstallButton** | Standalone install trigger button |
| **PWASettingsPage** | Admin settings page for PWA configuration |
```
