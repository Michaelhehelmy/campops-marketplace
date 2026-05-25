# Owner Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Owner**
2. Click **Install** then **Enable**

## Database

This plugin does **not** create dedicated tables — it uses core `user` and property tables.

## Validation

Owner registration and plan upgrade use Zod schemas:
- `registerSchema` — validates registration input
- `upgradeSchema` — validates upgrade request

## Hook

Emits `core:site:plan_upgraded` via `api.hooks.doAction` on successful plan upgrade.
```
