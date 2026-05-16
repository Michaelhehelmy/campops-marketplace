# Loyalty Plugin

> Guest loyalty points program — earn points on stays and purchases, redeem for discounts, and advance through reward tiers.

## What it does

- Awards points on `booking.checkout` (configurable multiplier per currency unit).
- Awards points on `order.created` (POS purchases).
- Intercepts `pricing.calculate` to apply point redemption discounts.
- Intercepts `guest.loyalty_points_earned` — customise point values with your own hook.
- Adds a **Loyalty** section to the guest portal (`/guest/points`, `/guest/mining`, `/guest/referrals`, `/guest/buy-points`).
- Adds a **Loyalty Settings** page to the admin panel (`/admin/loyalty`).

## Installation

Add to `plugin-manifest.json`:

```json
{
  "name": "loyalty",
  "version": "1.0.0",
  "campopsVersion": ">=2.0.0",
  "path": "./plugins/loyalty/src/index.ts",
  "enabled": true,
  "config": {
    "POINTS_PER_CURRENCY_UNIT": "1",
    "REDEMPTION_RATE": "0.01"
  }
}
```

## Configuration

| Key                        | Required | Default | Description                                               |
| -------------------------- | -------- | ------- | --------------------------------------------------------- |
| `POINTS_PER_CURRENCY_UNIT` | —        | `1`     | Points earned per 1 unit of currency spent                |
| `REDEMPTION_RATE`          | —        | `0.01`  | Value of 1 point in the booking currency (e.g. 0.01 = 1¢) |

## Tiers

Configurable from **Admin → Loyalty Settings**:

| Tier     | Default threshold | Bonus multiplier |
| -------- | ----------------- | ---------------- |
| Bronze   | 0 points          | 1×               |
| Silver   | 500 points        | 1.25×            |
| Gold     | 2000 points       | 1.5×             |
| Platinum | 5000 points       | 2×               |

## License

MIT
