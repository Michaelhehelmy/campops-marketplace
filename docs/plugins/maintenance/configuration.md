# Maintenance Plugin Configuration

> ⚠️ **Plugin-Specific Configuration** — Settings for the Maintenance plugin.

## Enabling the Plugin

1. Go to **Admin → Plugins → Maintenance**
2. Click **Install** then **Enable**

## Required Settings

### Staff Configuration

Assign maintenance role to staff:

1. **Staff → Team Members**
2. Edit staff member
3. Check **Maintenance** role
4. Save

### Categories

Configure maintenance categories:

```typescript
{
  categories: [
    { id: "plumbing", name: "Plumbing", defaultPriority: "normal" },
    { id: "electrical", name: "Electrical", defaultPriority: "urgent" },
    { id: "hvac", name: "HVAC", defaultPriority: "urgent" },
    { id: "appliance", name: "Appliances", defaultPriority: "normal" },
    { id: "furniture", name: "Furniture", defaultPriority: "low" },
    { id: "structural", name: "Structural", defaultPriority: "urgent" }
  ]
}
```

## Preventive Maintenance

### Schedule Configuration

Set up recurring maintenance:

```typescript
{
  preventive: [
    {
      assetId: "ac-unit-main",
      task: "AC Filter Replacement",
      frequency: "monthly",
      dayOfMonth: 1,
      estimatedHours: 2
    },
    {
      assetId: "pool-system",
      task: "Pool Chemical Check",
      frequency: "weekly",
      dayOfWeek: 1, // Monday
      estimatedHours: 1
    }
  ]
}
```

## Cost Tracking

### Labor Rates

```typescript
{
  laborRates: {
    "maintenance-tech": 35.00,
    "maintenance-supervisor": 50.00,
    "external-contractor": 75.00
  }
}
```

### Parts Inventory

Enable parts tracking:

```typescript
{
  partsInventory: {
    enabled: true,
    lowStockAlert: 5,
    autoReorder: true
  }
}
```

## Notifications

Configure alerts:

```typescript
{
  notifications: {
    emergencyImmediate: true,
    dailyDigest: true,
    overdueAlert: 24, // hours
    guestImpactAlert: true
  }
}
```

## Troubleshooting

### Requests Not Creating

1. Verify plugin is enabled
2. Check user has permission to create requests
3. Verify category exists

### Preventive Tasks Not Scheduling

1. Check asset exists in inventory
2. Verify frequency settings
3. Ensure maintenance staff assigned

### Costs Not Tracking

1. Verify labor rates configured
2. Check parts inventory enabled
3. Ensure staff recording hours
