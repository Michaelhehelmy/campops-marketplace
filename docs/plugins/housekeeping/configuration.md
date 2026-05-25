# Housekeeping Plugin Configuration

> ⚠️ **Plugin-Specific Configuration** — Settings for the Housekeeping plugin.

## Enabling the Plugin

1. Go to **Admin → Plugins → Housekeeping**
2. Click **Install** then **Enable**

## Required Settings

### Staff Configuration

Assign housekeeping role to staff:

1. **Staff → Team Members**
2. Edit staff member
3. Check **Housekeeping** role
4. Save

### Room Priorities

Set default priority by room type:

```typescript
{
  roomPriorities: {
    "vip-suite": "urgent",
    "deluxe-tent": "high",
    "standard-tent": "normal",
    "rv-spot": "low"
  }
}
```

## Task Types

Configure available task types:

```typescript
{
  taskTypes: [
    { id: "checkout_clean", name: "Checkout Cleaning", defaultTime: 30 },
    { id: "stayover_clean", name: "Stayover Service", defaultTime: 15 },
    { id: "deep_clean", name: "Deep Cleaning", defaultTime: 60 },
    { id: "maintenance", name: "Maintenance Task", defaultTime: 45 }
  ]
}
```

## Automatic Task Creation

Configure when tasks are auto-created:

```typescript
{
  autoCreate: {
    onCheckout: true,
    onStayover: false,
    advanceNotice: 0 // minutes before checkout time
  }
}
```

## Scheduling

### Shift Configuration

```typescript
{
  shifts: {
    morning: { start: "08:00", end: "16:00" },
    evening: { start: "14:00", end: "22:00" }
  }
}
```

### Task Assignment Rules

```typescript
{
  assignment: {
    autoAssign: true,
    maxTasksPerStaff: 8,
    considerShift: true,
    priorityWeight: 2.0 // Prioritize urgent tasks
  }
}
```

## Inspection Workflow

Enable inspection step:

```typescript
{
  inspection: {
    required: true,
    inspectorRole: ["manager", "supervisor"],
    autoSchedule: true
  }
}
```

## Troubleshooting

### Tasks Not Auto-Creating

1. Verify plugin is enabled for the property
2. Check booking hook is firing
3. Ensure checkout time matches expected schedule

### Staff Can't See Tasks

1. Verify staff has housekeeping role
2. Check task is assigned to them or unassigned
3. Ensure task date matches today's date

### Room Status Not Updating

1. Check task completion flow
2. Verify inspection step (if enabled)
3. Review room status mapping
