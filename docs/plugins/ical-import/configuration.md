# iCal Import Configuration

> ⚠️ **Plugin-Specific Configuration**

## Enabling
1. Go to **Admin → Plugins → iCal Import**
2. Click **Install** then **Enable**

## Overview

This plugin is an OTA adapter. It does **not** create database tables or HTTP routes. It integrates with the system's OTA sync framework to import external calendar feeds.

## OTA Adapter Details

| Property | Value |
|----------|-------|
| **ID** | `ical` |
| **Name** | iCal Import (Airbnb / VRBO) |
| **Listens to** | `ical.sync_requested` (priority 20) |
| **Executes** | `ical.sync_requested` |
```
