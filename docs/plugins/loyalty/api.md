# Loyalty Plugin API

> ⚠️ **Plugin-Specific API** — This plugin does **not** register any HTTP API routes. It operates entirely through hooks.

## Hook-Based Integration

The loyalty plugin listens to these hooks and provides points via interceptors rather than direct API endpoints:

| Hook | Listener Priority | Behavior |
|------|------------------|----------|
| `payment:success` | 20 | Awards points proportional to payment amount |
| `pricing:calculate` | 30 | Applies points redemption discount (100 points = $1 off) if `ctx.redeemPoints` is set |
| `BOOKING_CREATED` | 10 | Awards 500 welcome points to guest found by email |
| `CHECKOUT_COMPLETED` | 10 | Updates `total_stays`/`total_spend_usd`/`last_visit`, checks tier upgrade, schedules review request |
| `notification:send` | 10 | Logs notification details (placeholder for email adapter) |

The plugin also emits:

| Hook | When |
|------|------|
| `notification:send` | After checkout to schedule post-stay review request |

## UI Components

- **PointsWidget** — Registered for the guest dashboard slot, showing point balance and tier info
- **AdminPage** — Registered as a settings page for admin configuration

## Points & Tiers

Points are calculated using `LoyaltyService`:

- Award rate: configurable per payment (tier multiplier applies)
- Redemption: `pricing:calculate` interceptors deduct points from total
- Tiers: Regular (0), Silver (1000+ points), Gold (2500+ points), Platinum (5000+ points)
- Tier upgrade/downgrade checked automatically on CHECKOUT_COMPLETED and payment:success
