# Loyalty Plugin Configuration

> ⚠️ **Plugin-Specific Configuration** — Settings for the Loyalty plugin.

## Enabling the Plugin

1. Go to **Admin → Plugins → Loyalty**
2. Click **Install** then **Enable**

## Points System

### Earning Rates

Configure how guests earn points:

```typescript
{
  earning: {
    // Base rate: 1 point per $1 spent
    baseRate: 1.0,
    
    // Bonus on bookings
    bookingBonus: 2.0, // 2x points on room bookings
    
    // POS earning
    posEarning: 1.0, // 1 point per $1 on F&B
    
    // Activity bonuses
    bonuses: {
      firstBooking: 500,      // Welcome bonus
      reviewSubmitted: 100,   // Leave a review
      referral: 1000,         // Friend books
      socialShare: 50,        // Share on social
      birthday: 200         // Birthday month
    }
  }
}
```

## Tier System

### Tier Levels

Configure tier thresholds and benefits:

```typescript
{
  tiers: [
    {
      id: "bronze",
      name: "Bronze",
      minPoints: 0,
      multiplier: 1.0,
      benefits: []
    },
    {
      id: "silver",
      name: "Silver",
      minPoints: 1000,
      multiplier: 1.25,
      benefits: [
        "Late checkout (1pm)",
        "Free WiFi upgrade"
      ]
    },
    {
      id: "gold",
      name: "Gold",
      minPoints: 5000,
      multiplier: 1.5,
      benefits: [
        "Free room upgrade",
        "Late checkout (2pm)",
        "10% booking discount",
        "Priority support"
      ]
    },
    {
      id: "platinum",
      name: "Platinum",
      minPoints: 10000,
      multiplier: 2.0,
      benefits: [
        "Free suite upgrade",
        "Late checkout (4pm)",
        "20% booking discount",
        "Dedicated concierge",
        "Free breakfast"
      ]
    }
  ]
}
```

## Redemption Options

Configure what guests can redeem:

```typescript
{
  redemption: {
    options: [
      {
        id: "discount-25",
        name: "$25 Discount",
        type: "discount",
        points: 250,
        value: 25.00
      },
      {
        id: "discount-50",
        name: "$50 Discount",
        type: "discount",
        points: 500,
        value: 50.00
      },
      {
        id: "discount-100",
        name: "$100 Discount",
        type: "discount",
        points: 1000,
        value: 100.00
      },
      {
        id: "room-upgrade",
        name: "Room Upgrade",
        type: "upgrade",
        points: 1000,
        value: null // Dynamic based on upgrade value
      },
      {
        id: "late-checkout",
        name: "Late Checkout",
        type: "perk",
        points: 300,
        value: null
      },
      {
        id: "free-night",
        name: "Free Night",
        type: "free_night",
        points: 5000,
        value: null,
        restrictions: ["Blackout dates apply", "Subject to availability"]
      }
    ]
  }
}
```

## Point Expiration

Configure expiration policy:

```typescript
{
  expiration: {
    enabled: true,
    months: 24, // Points expire after 24 months of inactivity
    reminderDays: [30, 7, 1] // Reminders before expiration
  }
}
```

## Promotions

### Double Points Events

```typescript
{
  promotions: [
    {
      id: "summer-double",
      name: "Summer Double Points",
      type: "multiplier",
      multiplier: 2.0,
      startDate: "2024-06-01",
      endDate: "2024-08-31",
      bookingOnly: true
    }
  ]
}
```

## Referral Program

```typescript
{
  referral: {
    enabled: true,
    referrerBonus: 1000,  // Points when friend books
    refereeBonus: 500,     // Welcome bonus for new guest
    maxReferralsPerMonth: 5
  }
}
```

## Notifications

Configure guest notifications:

```typescript
{
  notifications: {
    pointsEarned: true,
    tierUpgrade: true,
    pointsExpiring: true,
    birthdayBonus: true,
    referralComplete: true
  }
}
```

## Troubleshooting

### Points Not Accruing

1. Verify plugin enabled for property
2. Check guest is enrolled in program
3. Verify earning rates configured
4. Ensure booking/payment completed

### Tier Not Upgrading

1. Check tier thresholds
2. Verify points calculation (lifetime vs current)
3. Ensure tier benefits configured
4. Check if manual tier override set

### Redemption Failing

1. Verify guest has sufficient points
2. Check redemption code not expired
3. Ensure reward type exists
4. Review any restrictions (blackout dates)

## Migration

Importing from another loyalty program:

1. Export guest data from old system
2. Map point values (may need conversion)
3. Bulk enroll via API
4. Set tier based on historical activity
5. Notify guests of new program
