# Hook Catalog

All hooks available to plugins, with their payload shapes and usage examples.

Hooks are called in **priority order** (lower number = earlier). Multiple plugins can register for the same hook — each handler receives the output of the previous one.

---

## Booking hooks

### `booking.created`

Fired when a new reservation is confirmed.

**Payload:**

```typescript
{
  reservationId: string;
  propertyId: string;
  guestId?: string;
  guestName: string;
  guestEmail?: string;
  roomId?: string;
  roomTypeName?: string;
  checkIn: string;       // ISO 8601
  checkOut: string;      // ISO 8601
  guestCount: number;
  totalAmount: number;
  currency: string;
  source: string;        // "internal" | "marketplace" | "ota"
  referenceNumber: string;
}
```

**Example — send confirmation email:**

```typescript
api.registerHook('booking.created', async (data, ctx) => {
  await api.services.notification.send({
    to: data.guestEmail,
    channel: 'email',
    subject: `Booking confirmed – ${data.referenceNumber}`,
    body: `Your stay from ${data.checkIn} to ${data.checkOut} is confirmed.`,
  });
  return data;
});
```

---

### `booking.cancelled`

Fired when a reservation is cancelled.

**Payload:** Same shape as `booking.created` plus:

```typescript
{
  cancelledAt: string;   // ISO 8601
  cancelledBy: string;   // user ID
  refundAmount?: number;
}
```

---

### `booking.checkin`

Fired when a guest checks in.

**Payload:**

```typescript
{
  reservationId: string;
  guestName: string;
  roomId: string;
  checkedInAt: string;
}
```

---

### `booking.checkout`

Fired when a guest checks out.

**Payload:**

```typescript
{
  reservationId: string;
  guestName: string;
  roomId: string;
  checkedOutAt: string;
  totalCharges: number;
  currency: string;
}
```

---

## Payment hooks

### `payment.initiated`

Fired when a payment flow starts. Handlers **can modify** the payload (e.g., add gateway metadata).

**Payload:**

```typescript
{
  orderId: string;
  amount: number;
  currency: string;
  guestEmail?: string;
  metadata?: Record<string, any>;
  paymentUrl?: string;       // set by payment gateway plugin
  transactionId?: string;    // set by payment gateway plugin
}
```

**Example — add payment URL:**

```typescript
api.registerHook('payment.initiated', async (data, ctx) => {
  const result = await callMyGateway(data.amount, data.currency);
  return { ...data, paymentUrl: result.url, transactionId: result.id };
});
```

---

### `payment.on_success`

Fired after a payment completes successfully.

**Payload:**

```typescript
{
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  guestEmail?: string;
  paidAt: string;
}
```

---

### `payment.on_failure`

Fired when a payment attempt fails.

**Payload:**

```typescript
{
  orderId: string;
  amount: number;
  currency: string;
  errorCode: string;
  errorMessage: string;
}
```

---

## Pricing hooks

### `pricing.calculate`

Fired during rate calculation. Handlers **can modify** `baseAmount` to apply discounts, surcharges, or dynamic pricing.

**Payload:**

```typescript
{
  baseAmount: number;
  nights: number;
  guests: number;
  checkIn: string;
  checkOut: string;
  roomTypeId: string;
  ratePlanId?: string;
  promoCode?: string;
  currency: string;
}
```

**Example — 10% promo discount:**

```typescript
api.registerHook('pricing.calculate', async (data, ctx) => {
  if (data.promoCode === 'CAMP10') {
    return { ...data, baseAmount: Math.round(data.baseAmount * 0.9 * 100) / 100 };
  }
  return data;
});
```

**Example — weekend surcharge:**

```typescript
api.registerHook('pricing.calculate', async (data, ctx) => {
  const dow = new Date(data.checkIn).getDay();
  const isWeekend = dow === 5 || dow === 6; // Fri / Sat
  return { ...data, baseAmount: isWeekend ? data.baseAmount * 1.15 : data.baseAmount };
});
```

---

## Order hooks (POS)

### `order.created`

Fired when a new POS order is placed.

**Payload:**

```typescript
{
  orderId: string;
  tableNumber?: number;
  items: { name: string; qty: number; price: number }[];
  totalAmount: number;
  currency: string;
  createdBy: string;
}
```

---

### `order.status_changed`

Fired when an order's status changes (e.g., `pending` → `preparing` → `ready` → `served`).

**Payload:**

```typescript
{
  orderId: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
}
```

---

## Loyalty hooks

### `guest.loyalty_points_earned`

Fired when a guest earns loyalty points. Handlers **can modify** `pointsEarned`.

**Payload:**

```typescript
{
  guestId: string;
  guestName: string;
  reservationId?: string;
  orderId?: string;
  pointsEarned: number;
  balanceBefore: number;
  reason: string;
}
```

**Example — bonus points on weekends:**

```typescript
api.registerHook('guest.loyalty_points_earned', async (data, ctx) => {
  const isWeekend = [0, 6].includes(new Date().getDay());
  return { ...data, pointsEarned: isWeekend ? data.pointsEarned * 2 : data.pointsEarned };
});
```

---

## OTA hooks

### `ota.reservation_received`

Fired when an OTA adapter imports a reservation. Handlers **can modify** the payload to enrich it before it is stored.

**Payload:**

```typescript
{
  channelRef: string;
  source: string;         // OTA name
  guestName: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  totalAmount: number;
  currency: string;
  rawPayload?: any;       // original OTA response
}
```

---

## Hook priority guidelines

| Priority | Use case                                          |
| -------- | ------------------------------------------------- |
| 1–5      | Security / validation (reject invalid data early) |
| 6–10     | Data enrichment (add fields)                      |
| 11–50    | Business logic (modify pricing, apply rules)      |
| 51–100   | Side effects (notifications, external API calls)  |

Set priority as the third argument:

```typescript
api.registerHook('booking.created', handler, 51); // side effect — runs late
```
