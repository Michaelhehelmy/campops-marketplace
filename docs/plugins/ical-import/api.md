# iCal Import Plugin API

> ⚠️ **Plugin-Specific API**

This plugin is an **OTA adapter** — it exposes no HTTP endpoints.

## OTA Adapter

| Property | Value |
|----------|-------|
| **ID** | `ical` |
| **Name** | iCal Import (Airbnb / VRBO) |
| **Type** | OTAAdapter |

## Hooks

- Listens to `ical.sync_requested` (priority 20) to process external iCal feed imports
- Also executes `ical.sync_requested` to trigger feed synchronization

The adapter imports availability data from external calendar feeds (Airbnb, VRBO, etc.) and integrates it with the system's sync framework.
