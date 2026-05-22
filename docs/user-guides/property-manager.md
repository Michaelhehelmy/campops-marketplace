# Property Manager Guide

## Role Description

A **Property Manager** handles day-to-day operations for one or more properties on the SinaiCamps Marketplace. Managers can manage bookings, rooms, guests, staff, finances, and property settings.

## How to Get This Role

Property Manager access is assigned by a Master Admin or by the Property Owner. The assignment is made through the **Staff Roster** page in the property's management dashboard.

---

## Dashboard Overview

After logging in, you are redirected to the property management dashboard at `/en/manage/[listingId]`.

### Sidebar Navigation

The sidebar on the left shows all available sections. The visibility of each section depends on your property's plan tier:

| Menu Item            | Route                          | Min Role | Description                    |
| -------------------- | ------------------------------ | -------- | ------------------------------ |
| **Dashboard**        | `/en/manage/[id]`              | all      | Key metrics and quick overview |
| **Bookings**         | `/en/manage/[id]/bookings`     | all      | View and manage reservations   |
| **Rooms & Units**    | `/en/manage/[id]/rooms`        | manager  | Room types, inventory, pricing |
| **Guests (CRM)**     | `/en/manage/[id]/guests`       | staff    | Guest profiles and history     |
| **Orders & POS**     | `/en/manage/[id]/orders`       | staff    | On-site sales and orders       |
| **Housekeeping**     | `/en/manage/[id]/housekeeping` | staff    | Room status and cleaning tasks |
| **Maintenance**      | `/en/manage/[id]/maintenance`  | staff    | Work orders and repairs        |
| **Operations**       | `/en/manage/[id]/operations`   | staff    | Daily operations hub           |
| **Finance**          | `/en/manage/[id]/finance`      | manager  | Revenue, payouts, reports      |
| **Staff Roster**     | `/en/manage/[id]/staff`        | manager  | Team management                |
| **Listing Settings** | `/en/manage/[id]/settings`     | manager  | Property configuration         |

### Dashboard Widgets

The dashboard shows key performance indicators:

- **Total Bookings** — number of confirmed reservations
- **Occupancy Rate** — current occupancy percentage
- **Net Revenue** — revenue after platform fees
- **Arrivals Today** — guests checking in today
- **Departures Today** — guests checking out today
- **Enabled Plugins** — count of active plugins for this property

---

## Managing Listings

### Editing Property Details

Navigate to **Listing Settings** → **General** tab to edit:

- Property name and description
- Location (city, country)
- Currency (USD, EUR, GBP, AED, EGP, SAR, ZAR)
- Property type (camp, hotel, glamping, lodge, resort, villa)
- Photos and images

### Property Visibility

Toggle your property's active status in settings. An active property appears in public search results and can accept bookings.

---

## Booking Management

Navigate to **Bookings** in the sidebar to see all reservations.

### Viewing Bookings

The bookings page lists all reservations with:

- Guest name and email
- Check-in and check-out dates
- Number of guests
- Total price
- Status (confirmed, checked-in, checked-out, cancelled, pending)
- Notes

### Booking Actions

| Action         | Effect                                                  |
| -------------- | ------------------------------------------------------- |
| **Check In**   | Marks the guest as arrived. They can access their room. |
| **Check Out**  | Marks the stay as complete. Finalizes charges.          |
| **Edit Notes** | Opens a modal to add or edit notes on the reservation.  |

### Workflow

1. **Guest arrives** → Click **Check In** to mark them as arrived.
2. **During stay** → Use notes to track special requests or issues.
3. **Guest departs** → Click **Check Out** to finalize the booking.

---

## Room Management

Navigate to **Rooms & Units** to manage your inventory.

### Viewing Rooms

The page shows all room types and units with:

- Room type name
- Price per night
- Capacity
- Availability status

### Adding a Room Type

1. Click the **+ Add Room Type** button.
2. Enter a name for the room type.
3. Set the price per night.
4. Click **Save** to create the room type.

### Managing Room Availability

Room availability and pricing can be managed per-night. This is especially important during:

- Peak seasons (increase pricing)
- Maintenance periods (mark as unavailable)
- Special events (adjust minimum stays)

<Callout type="info">
**Plugin note:** Advanced room management features (bulk availability updates, dynamic pricing, calendar sync) are available through plugins like **iCal Sync** and **Channel Manager**.
</Callout>

---

## Guest Management

Navigate to **Guests (CRM)** to view guest profiles.

### Guest List View

Shows all guests who have booked this property with:

- Name
- Email
- Total stays
- Total spend
- Recent bookings

### Guest Profile View

Click on a guest to see their detailed profile:

- Contact information
- Booking history
- Spending summary
- Notes and preferences

---

## Staff Management

Navigate to **Staff Roster** to manage your team.

### Adding Staff Members

1. Click the **+ Add Staff Member** button.
2. Enter the staff member's name and email.
3. Select their role.
4. Send the invitation.

### Staff Roles

| Role        | Access Level                                                                  |
| ----------- | ----------------------------------------------------------------------------- |
| **Manager** | Full access to all sections including finance and settings                    |
| **Staff**   | Limited to operations — check-in/out, housekeeping, maintenance, guest lookup |

### Staff Status

Each staff member has a status:

- **On Duty** — currently working
- **Off Duty** — not currently working

You can filter staff by status and role.

---

## Financial Reports

Navigate to **Finance** to view financial data.

<Callout type="warning">
**Access restricted:** This page is only visible to users with the Manager role. Staff members will see an "Unauthorized" message.
</Callout>

### Financial Dashboard

- **Total Revenue** — all earnings from bookings and on-site sales
- **Net Payouts** — revenue after platform commission fees
- **Export Statements** — download financial reports as CSV

### Understanding Commissions

Platform commissions are calculated based on your property's plan tier:

- **Basic** — standard commission rate
- **Premium** — reduced commission rate
- **Ultimate** — lowest commission rate

---

## Mobile App (PWA)

The SinaiCamps Marketplace supports Progressive Web App (PWA) functionality for mobile access.

### Installing the PWA

1. Open the management dashboard in your mobile browser (Chrome or Safari).
2. Look for the **Install App** prompt or use the browser menu.
3. Select **Add to Home Screen**.
4. The app icon will appear on your home screen.

### PWA Features

- Mobile-optimized interface
- Offline access to key data
- Push notifications for new bookings
- Quick check-in/out from mobile

---

## Troubleshooting

### A booking is not showing up

1. Check that the **booking plugin** is enabled in Plugins.
2. Refresh the page to clear cached data.
3. Verify the guest completed the payment process.

### A staff member cannot log in

1. Verify they are listed in the **Staff Roster**.
2. Check that their email is correct.
3. Ask a Master Admin to check their account status.

### Custom domain not working

1. Navigate to **Listing Settings** → **Domain** tab.
2. Click **Check Domain** to verify DNS configuration.
3. Ensure your property has the **Ultimate** plan (required for custom domains).

---

## Related Guides

- [Staff Guide](./staff.md) — for staff member operations
- [Property Owner Guide](./property-owner.md) — for property owners
- [Plan Comparison](./plan-comparison.md) — plan tier details
- [Master Admin Guide](./master-admin.md) — for platform-level management
