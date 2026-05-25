# Owner Plugin

> ⚠️ **Plugin-Specific Documentation** — Owner plugin.

## Overview

Property owner account management — registration, profile access, and plan upgrades.

## Features

- **Owner Registration** — Public registration endpoint with Zod validation
- **Owner Profile** — Authenticated endpoint to view owner details
- **Plan Upgrades** — Owner-subscription upgrade with role verification
- **Hook Events** — Emits `core:site:plan_upgraded` on successful upgrade
- **No Dedicated Tables** — Uses core user and property tables

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
