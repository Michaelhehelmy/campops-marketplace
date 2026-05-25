# POS & KDS Plugin User Guide

> ⚠️ **Plugin-Specific Guide** — How to use the POS and Kitchen Display System.

## For Cashiers/Servers

### Taking Orders

#### New Order

1. **Open POS interface**
2. Select order type:
   - **Dine In** — Select table number
   - **Takeout** — Customer name/phone
   - **Room Service** — Enter room/booking number
   - **Bar** — Select bar tab or walk-in

3. **Add Items:**
   - Click category (Breakfast, Lunch, etc.)
   - Click menu item
   - Select modifiers (Add Bacon, No Onions, etc.)
   - Add notes: "Allergic to nuts" or "Extra crispy"
   - Change quantity if needed

4. **Review Order:**
   - See item list with prices
   - Subtotal and tax
   - Total amount

5. **Send to Kitchen:**
   - Click **Send Order**
   - Tickets print at appropriate stations
   - KDS displays order immediately

#### Modifying Orders

**Before Sent:**
- Click item → Edit or Remove
- Add more items
- Change modifiers

**After Sent:**
1. Click **Modify Order**
2. Add new items (sent as additional ticket)
3. Or **Void Item** (requires manager code)

#### Processing Payment

1. Click **Pay**
2. Select payment method:
   - **Cash** — Enter amount tendered, system calculates change
   - **Card** — Swipe/insert/tap or enter manually
   - **Room Charge** — Enter booking ID, verify guest name
   - **Loyalty Points** — Scan guest QR code or enter phone

3. Add tip (for card payments)
4. Print or email receipt
5. Order marked complete

#### Split Bills

1. Click **Split**
2. Drag items to separate checks
3. Or **Split Evenly** by number of people
4. Pay each check separately

### Managing Tables

**Table Status View:**

- 🟢 **Available** — Ready for guests
- 🟡 **Seated** — Guests seated, no order yet
- 🔵 **Ordered** — Order sent to kitchen
- 🟠 **Served** — Food delivered
- 🔴 **Needs Attention** — Refills, payment ready
- ⚪ **Dirty** — Needs bussing

**Quick Actions:**
- Tap table → See order details
- Long press → Start new order
- Drag items between tables (for moved guests)

## For Kitchen Staff (KDS)

### Kitchen Display System

**Screen Layout:**

```
┌─────────────────────────────────────┐
│  NEW (4)  PREP (3)  READY (2)        │
├─────────────────────────────────────┤
│                                     │
│  T-5        8:32 AM      12 min    │
│  Eggs Benedict x2                  │
│  → Add Bacon                       │
│  → No hollandaise                  │
│  [START]                            │
│                                     │
│  Bar-3      8:35 AM       9 min    │
│  Cappuccino x1                     │
│  Orange Juice x2                     │
│  [PREPARING]  [READY]              │
│                                     │
└─────────────────────────────────────┘
```

### Order Workflow

**1. New Orders (Left Column)**
- Orders just received
- Show elapsed time
- Color changes: 🟢 (< 10 min) → 🟡 (10-20 min) → 🔴 (> 20 min)

**2. In Progress (Middle)**
- Click **START** when begin cooking
- Shows which items you're working on
- Can bump back to NEW if needed

**3. Ready (Right)**
- Click **READY** when food plated
- Notifies server/runner
- Stays visible until marked "Served"

### Rush Orders

**Mark Priority:**
- Click order → **Mark Rush**
- Order moves to top
- Screen flashes/highlighted
- Server gets notification

### 86 (Out of Stock)

**Temporarily Unavailable:**

1. Click **86 Item**
2. Select item from menu
3. Set duration (until end of day, 1 hour, etc.)
4. POS automatically shows "Sold Out"
5. Can re-enable when restocked

### Recipe View

**Check Preparation:**

1. Click item name
2. See recipe/steps
3. Allergen information
4. Photo of finished dish (if available)

## For Managers

### Daily Operations

**Opening:**
1. Verify all stations logged in
2. Check printer paper levels
3. Review 86 list from previous day
4. Check inventory alerts

**During Service:**
- Monitor KDS for backup orders
- Watch average ticket times
- Handle voids and comps
- Address technical issues

**Closing:**
1. Close out all open checks
2. Count cash drawer
3. Print daily sales report
4. Review tips distribution
5. Check for unvoided errors

### Sales Reports

**Access Reports:**

1. **Manager → Reports → POS**
2. Available reports:
   - **Sales by Item** — What sold, quantity, revenue
   - **Sales by Category** — Breakfast vs Lunch vs Bar
   - **Staff Performance** — Orders taken, tips received
   - **Hourly Sales** — Peak times
   - **Payment Methods** — Cash vs Card breakdown

**Export Data:**
- CSV for accounting
- PDF for owners
- Real-time dashboard for monitoring

### Menu Management

**Update Menu:**

1. **Settings → Menu**
2. Add/Edit/Remove items:
   - Change prices
   - Update availability
   - Add modifiers
   - Link ingredients
3. Changes sync immediately to POS

**86 Management:**

1. **Kitchen → 86 List**
2. See all temporarily unavailable items
3. Re-enable when available
4. Set auto-re-enable time

### Staff Management

**Track Performance:**

1. **Staff → POS Performance**
2. See per-server metrics:
   - Orders taken
   - Average ticket
   - Upsell success
   - Void rate (should be low!)

**Configure Permissions:**

1. **Staff → Roles**
2. Set who can:
   - Void items (manager only)
   - Apply discounts (manager only)
   - Modify closed orders (supervisor+)
   - Access reports (manager only)

## For Bar Staff

### Bar Tab System

**Open Tab:**

1. **New Tab**
2. Swipe credit card to hold (pre-auth)
3. Or enter room number for charging
4. Add name/identifier (e.g., "Blue Shirt")
5. Add drinks as ordered

**Add to Tab:**

1. Select tab
2. Add drinks
3. Update running total shown

**Close Tab:**

1. **Close Out**
2. Add tip
3. Process final charge
4. Return card, print receipt

### Quick Service

**Walk-up Orders:**

1. **Quick Order**
2. Add drinks immediately
3. Payment required before service
4. Print receipt for pickup

## Tips & Best Practices

### For Servers

- **Verify allergies** — Always ask, always note
- **Repeat order** — Confirm with guest before sending
- **Course timing** — Hold appetizers if entrees almost ready
- **Upsell naturally** — "Would you like bacon with that?"
- **Keep KDS in view** — Watch for your orders coming up

### For Kitchen

- **FIFO** — First In, First Out (oldest orders first)
- **Communicate** — Call out when items ready
- **Keep station clean** — Organized workspace = faster service
- **Watch timers** — Color coding helps prioritize
- **86 early** — Mark out of stock before you run out

### For Bar

- **Verify ID** — For alcohol service
- **Monitor tabs** — Watch for limits on room charges
- **Batch drinks** — Make multiple same drinks together
- **Keep glassware stocked** — Nothing slows like washing

### For Managers

- **Monitor ticket times** — Guests notice slow food
- **Watch voids** — Pattern may indicate training needed
- **Update menu** — Seasonal items, price changes
- **Keep backups** — Printer paper, backup POS device
- **Review daily** — Spot trends early

## Troubleshooting

### Order Sent to Wrong Station

1. Check item's station assignment in menu
2. Re-route manually if needed
3. Update menu for future orders

### KDS Frozen/Lagging

1. Check internet connection
2. Refresh browser/app
3. Clear cache if web-based
4. Contact IT if persistent

### Printer Out of Paper

1. Load new paper roll
2. Test print from settings
3. Re-print last order if needed
4. Keep spare rolls nearby

### Card Declined

1. Try again (may be reader error)
2. Ask for different card
3. Offer to split payment
4. Suggest ATM or room charge if available

### Wrong Item Sent

1. **Void immediately**
2. Re-ring correct item
3. Mark as **Rush**
4. Tell kitchen it's a correction
5. Apologize to guest, offer comp if delayed
