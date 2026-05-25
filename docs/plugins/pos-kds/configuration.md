# POS & KDS Plugin Configuration

> ⚠️ **Plugin-Specific Configuration** — Settings for the POS-KDS plugin.

## Enabling the Plugin

1. Go to **Admin → Plugins → POS & KDS**
2. Click **Install** then **Enable**

## Menu Configuration

### Categories

Create menu structure:

```typescript
{
  categories: [
    { id: "breakfast", name: "Breakfast", sortOrder: 1 },
    { id: "lunch", name: "Lunch", sortOrder: 2 },
    { id: "dinner", name: "Dinner", sortOrder: 3 },
    { id: "beverages", name: "Beverages", sortOrder: 4 },
    { id: "bar", name: "Bar", sortOrder: 5 }
  ]
}
```

### Menu Items

Configure items:

```typescript
{
  items: [
    {
      id: "eggs-benedict",
      name: "Eggs Benedict",
      category: "breakfast",
      price: 18.00,
      cost: 6.00,
      available: true,
      stations: ["kitchen"], // Which KDS stations
      modifiers: [
        { id: "add-bacon", name: "Add Bacon", price: 3.00 },
        { id: "no-hollandaise", name: "No Hollandaise", price: 0 }
      ],
      ingredients: [
        { itemId: "eggs", qty: 2 },
        { itemId: "english-muffin", qty: 1 }
      ]
    }
  ]
}
```

## Kitchen Display System

### Stations

Configure kitchen stations:

```typescript
{
  stations: [
    { id: "kitchen", name: "Main Kitchen", displayName: "KITCHEN" },
    { id: "grill", name: "Grill Station", displayName: "GRILL" },
    { id: "bar", name: "Bar", displayName: "BAR" },
    { id: "prep", name: "Cold Prep", displayName: "PREP" }
  ]
}
```

### Station Routing

Auto-route items to stations:

```typescript
{
  routing: {
    "breakfast": ["kitchen"],
    "grill-items": ["grill"],
    "beverages": ["bar"],
    "salads": ["prep"]
  }
}
```

## Payment Methods

Configure accepted payments:

```typescript
{
  paymentMethods: [
    { id: "cash", name: "Cash", enabled: true },
    { id: "card", name: "Credit Card", enabled: true },
    { id: "room_charge", name: "Room Charge", enabled: true },
    { id: "loyalty", name: "Loyalty Points", enabled: true }
  ]
}
```

## Tax Configuration

```typescript
{
  tax: {
    name: "Sales Tax",
    rate: 0.08, // 8%
    included: false // Add to subtotal
  }
}
```

## Service Charges

```typescript
{
  serviceCharges: {
    gratuity: {
      enabled: true,
      autoAddForParties: 6,
      percentage: 0.18 // 18%
    }
  }
}
```

## Hardware Integration

### Receipt Printer

```typescript
{
  hardware: {
    receiptPrinter: {
      enabled: true,
      model: "epson-tm-t20",
      connection: "usb"
    }
  }
}
```

### Cash Drawer

```typescript
{
  hardware: {
    cashDrawer: {
      enabled: true,
      openOnCashPayment: true
    }
  }
}
```

## Troubleshooting

### Orders Not Showing on KDS

1. Verify station assignment in menu item
2. Check KDS display is on correct station
3. Ensure order status is "new" or "preparing"

### Room Charge Not Working

1. Verify booking ID is valid
2. Check guest hasn't checked out
3. Ensure room charge payment method enabled
4. Verify booking allows charges

### Printer Not Responding

1. Check printer power and connection
2. Verify printer model in settings
3. Test print from settings page
4. Check for paper jam

### Inventory Not Updating

1. Verify ingredients linked to menu items
2. Check inventory plugin is enabled
3. Ensure inventory items exist
