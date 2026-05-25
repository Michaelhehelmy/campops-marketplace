# iCal Import Plugin

> ⚠️ **Plugin-Specific Documentation** — iCal Import plugin.

## Overview

OTA adapter that imports external iCal calendar feeds (Airbnb, VRBO) to sync availability.

## Features

- **iCal Feed Import** — Pull availability from external calendar feeds
- **OTA Adapter** — Integrates with the sync framework via `ical.sync_requested` hook
- **No Database Tables** — Operates as a lightweight adapter without dedicated tables

**Note:** This plugin exposes no HTTP endpoints — it operates as an OTA adapter only.

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
