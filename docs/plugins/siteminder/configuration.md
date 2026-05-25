# SiteMinder Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → SiteMinder**
2. Click **Install** then **Enable**

## Environment Variables

The plugin reads configuration from environment variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `SITEMINDER_API_KEY` | Yes | API key for SiteMinder authentication |
| `SITEMINDER_HOTEL_ID` | Yes | Hotel/property identifier in SiteMinder |
| `SITEMINDER_BASE_URL` | Yes | Base URL for SiteMinder API endpoints |

## OTA Adapter

This plugin is an OTA adapter. It does **not** create database tables or HTTP routes. The adapter provides inventory sync, rate sync, reservation fetch, and cancellation methods through the OTA adapter framework.
```
