# Listing Admin Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → Listing Admin**
2. Click **Install** then **Enable**

## Overview

This plugin provides administrative property analytics through the dashboard. It does **not** create dedicated database tables — it reads from core reservation and listing tables.

## Dashboard Widget

Registers a **'Property Performance'** dashboard widget that displays:
- Revenue totals
- Fee breakdowns
- Booking counts
- Net payout summaries

## Hook

Listens to `dashboard.get_stats` to compute and return property performance statistics.
```
