# Loyalty Plugin

> ⚠️ **Plugin-Specific Documentation** — This documentation is for the Loyalty plugin, which extends the core SinaiCamps platform.

## Overview

The Loyalty plugin manages guest rewards programs, points accrual, tier progression, and redemption. It tracks guest activity and rewards repeat bookings.

## Features

- **Points System** — Earn points on bookings and purchases via hooks
- **Tier Levels** — Regular → Silver → Gold → Platinum progression based on points and spend
- **Redemption** — Redeem points for discounts via `pricing:calculate` hook (100 points = $1 off)
- **Integration** — Listens to `payment:success`, `BOOKING_CREATED`, and `CHECKOUT_COMPLETED` hooks

## Quick Start

1. **Enable the plugin** in admin panel
2. **Configure point values** (1 point per $1 spent)
3. **Set tier thresholds**
4. **Define redemption options**
5. **Enroll existing guests**

## Database Schema

### Tables

- `plugin_loyalty_point_transactions` — Point earn/burn records (guest_id, amount, type, reference_id, expires_at)
- `plugin_loyalty_exchange_rates` — Currency conversion rates (currency_code, exchange_rate, is_active)

### Indexes

- `idx_loyalty_pt_guest` — Point transaction guest lookup
- `idx_loyalty_er_currency` — Exchange rate currency lookup

## Related Documentation

- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [User Guide](./user-guide.md)
