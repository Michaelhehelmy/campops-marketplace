# SiteMinder Plugin

> ⚠️ **Plugin-Specific Documentation** — SiteMinder integration plugin.

## Overview

OTA adapter for SiteMinder channel manager integration, enabling distribution and synchronization with 400+ OTAs.

## Features

- **OTA Adapter** — Integrates via the system's OTA adapter framework
- **Inventory Sync** — Sync availability with SiteMinder
- **Rate Sync** — Push pricing updates to connected channels
- **Reservation Fetch** — Pull reservations from SiteMinder
- **Cancellation Support** — Process cancellations through the adapter

**Note:** This plugin exposes no HTTP endpoints — it operates as an OTA adapter only. Configuration is via environment variables.

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
