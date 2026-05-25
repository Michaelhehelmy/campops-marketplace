# iCal Plugin

> ⚠️ **Plugin-Specific Documentation** — iCal plugin.

## Overview

Hook-driven module that manages iCal calendar synchronization for bookings, responding to reservation lifecycle events.

## Features

- **Event-Driven** — Reacts to reservation create and cancel events
- **iCal Feed Sync** — Generates and syncs iCal feed data via hooks
- **Event Publishing** — Emits reservation and iCal events for external consumers

**Note:** This plugin exposes no HTTP endpoints — it operates entirely through the hook system.

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
