# CRM Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the CRM (Customer Relationship Management) plugin, which extends the core SinaiCamps platform.

## Overview

The CRM plugin manages guest relationships, tracks interactions, and enables personalized marketing. It provides a 360-degree view of guest history and preferences.

## Features

- **Activity Tracking** — Logs guest activities on `BOOKING_CREATED` hook
- **Activity API** — Query guest activities with role-based filtering (guests see own, managers see all)
- **Integration** — Registers an `ActivityWidget` for guest dashboard

## Quick Start

1. **Enable the plugin** in admin panel
2. **Activities automatically log** when bookings are created

## Database Schema

### Tables

- `plugin_crm_activities` — Guest interactions (guest_email, activity_type, details, severity, created_at)

### Indexes

- `idx_crm_activities_email` — Guest email lookup
- `idx_crm_activities_type` — Activity type and date queries

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
