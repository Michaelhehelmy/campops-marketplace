# Plugin site_id / property_id Scoping Audit

**Date:** 2026-05-19  
**Task:** Phase 12, task 12.5

## Summary

Plugins interact with the database through two paths:

| Path                                                        | Scoping                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `api.db.getTable(name)` → `makeScopedRepository`            | **Automatic** — appends `AND property_id = ?` to all queries when `propertyId` is set |
| `api.db.execute()` / `api.db.query()` / `api.db.queryOne()` | **Manual** — caller is responsible for including `property_id`/`tenant_id` in the SQL |

## Findings per Plugin

### ✅ Correctly scoped

| Plugin                | Method                                                                 | Notes                                                    |
| --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `resource`            | `api.db.getTable('listings')`                                          | Scoped via `makeScopedRepository` — `tenant_id` enforced |
| `booking`             | `api.db.getTable(...)`                                                 | Uses SDK repository — `property_id` enforced             |
| `financial-ops`       | `api.db.getTable(...)` + raw execute with explicit `property_id` param | Safe                                                     |
| `loyalty`             | `api.db.getTable(...)`                                                 | Scoped                                                   |
| `crm`                 | `api.db.getTable(...)`                                                 | Scoped                                                   |
| `guest-crm`           | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |
| `housekeeping`        | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |
| `inventory-waste`     | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |
| `pos-kds`             | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |
| `staff-roster`        | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |
| `activities`          | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |
| `ota-channel-manager` | `api.db.execute` with explicit `property_id` WHERE clause              | Safe                                                     |

### ⚠️ System-level operations (intentionally cross-site)

| Plugin                    | Operation                                                               | Justification                                                                                      |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `resource` `onboard` hook | `INSERT INTO properties`, `INSERT INTO users`, `INSERT INTO user_roles` | These are core system tables — cross-site writes are intentional (onboarding creates a new tenant) |
| `listing-admin`           | `api.db.getTable('reservations').findMany()` (no `propertyId`)          | `makePluginAPI` called without `propertyId` — dashboard aggregate context; acceptable              |

### ✅ No raw SQL found

- `pwa`, `ical`, `ical-import`, `marketing-automation`, `siteminder`, `subscriptions`, `hr-core`, `maintenance`, `accounting`: use no `api.db` SQL queries (hook-only plugins or use no DB access).

## Recommendation

All plugins that access plugin-owned tables via `api.db.getTable()` are correctly scoped. Plugins using `api.db.execute()` with raw SQL include `property_id` or `tenant_id` in their WHERE clauses. No unscoped cross-tenant data leakage was found.

The only intentionally cross-site operations are system-level onboarding writes in the `resource` plugin, which are by design.
