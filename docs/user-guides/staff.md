# Staff Guide

## Role Description

**Staff** members have limited access to the SinaiCamps Marketplace. They can perform daily operational tasks — checking guests in and out, managing housekeeping, tracking maintenance, and looking up guest information. They cannot access financial data, settings, or plugin management.

## How to Get This Role

Staff access is assigned by a **Property Manager** or **Master Admin** through the **Staff Roster** page in the property's management dashboard.

---

## Dashboard Overview

After logging in, you are redirected to the property's management dashboard at `/en/manage/[listingId]`.

### Sidebar Navigation

As a staff member, you will see a simplified sidebar with only the sections relevant to your role:

| Menu Item        | Route                          | Description                    |
| ---------------- | ------------------------------ | ------------------------------ |
| **Dashboard**    | `/en/manage/[id]`              | Key metrics and daily overview |
| **Bookings**     | `/en/manage/[id]/bookings`     | View and manage reservations   |
| **Guests (CRM)** | `/en/manage/[id]/guests`       | Guest profiles and history     |
| **Orders & POS** | `/en/manage/[id]/orders`       | On-site sales and orders       |
| **Housekeeping** | `/en/manage/[id]/housekeeping` | Room status and cleaning       |
| **Maintenance**  | `/en/manage/[id]/maintenance`  | Work orders and repairs        |
| **Operations**   | `/en/manage/[id]/operations`   | Daily operations hub           |

### Sections You Cannot Access

The following sections are **restricted** for staff members:

- **Rooms & Units** — room pricing and inventory management
- **Finance** — revenue, payouts, and financial reports
- **Staff Roster** — team management
- **Listing Settings** — property configuration and domain setup
- **Plugins** — plugin installation and configuration

If you try to access a restricted page, you will see an "Unauthorized" message.

---

## Daily Operations

### Checking In Guests

1. Navigate to **Bookings** in the sidebar.
2. Find the guest's reservation in the list.
3. Click the **Check In** button next to their booking.
4. Confirm the action. The booking status changes from "confirmed" to "checked-in".

**Before you begin:**

- Verify the guest's identity (ask for their booking confirmation or ID).
- Confirm the room is ready and clean.

### Checking Out Guests

1. Navigate to **Bookings**.
2. Find the guest's reservation.
3. Click the **Check Out** button.
4. Confirm the action. The booking status changes to "checked-out".

**Before you begin:**

- Verify all charges have been settled.
- Check for any outstanding items (mini-bar, damages, etc.).

### Editing Booking Notes

1. Navigate to **Bookings**.
2. Click the **Manage** action on a booking.
3. Add or edit notes in the modal that appears.
4. Click **Save Changes**.

This is useful for tracking:

- Special requests (e.g., "Guest requested early check-in")
- Issues during the stay
- Notes from previous staff members

---

## Housekeeping Tasks

Navigate to **Housekeeping** to manage room cleaning status.

### Viewing Room Status

The housekeeping dashboard shows:

- **Total Rooms** — all rooms in the property
- **Dirty** — rooms needing cleaning
- **Cleaning** — rooms currently being cleaned
- **Ready** — clean and available rooms

Each room card shows:

- Room number and name
- Current status (dirty, cleaning, ready)
- Priority level

### Updating Room Status

1. Click on a room card.
2. Select the new status:
   - **Dirty** → guest checked out, needs cleaning
   - **Cleaning** → staff is currently cleaning
   - **Ready** → clean and available for new guests
3. The dashboard updates in real-time.

### Assigning Cleaning Tasks

Click the **Assign Tasks** button to delegate cleaning responsibilities to specific staff members. This helps coordinate the team during busy periods.

---

## Maintenance Requests

Navigate to **Maintenance** to track and manage work orders.

### Viewing Maintenance Tasks

The maintenance dashboard shows:

- **Critical Tasks** — urgent issues requiring immediate attention
- **Pending** — open work orders
- **Completed** — resolved tasks

Each task card shows:

- Task ID and title
- Location (room or area)
- Priority (critical, high, normal, low)
- Status (pending, in progress, completed)
- Time since reported

### Creating a New Ticket

1. Click the **+ New Ticket** button.
2. Enter:
   - **Title** — brief description of the issue
   - **Location** — where the issue is
   - **Priority** — how urgent it is
   - **Description** — detailed information
3. Click **Submit**.

### Updating a Ticket

1. Click on an existing ticket.
2. Update the status or add notes.
3. Save changes.

---

## Guest Look-Up

Navigate to **Guests (CRM)** to find guest information.

### Searching for a Guest

1. The guest list shows all guests who have stayed at the property.
2. Use the **Search** bar to find a guest by name or email.
3. Click on a guest to view their profile.

### Guest Profile Information

The profile page shows:

- **Email** — contact email
- **Total Stays** — number of times they've stayed
- **Total Spend** — aggregate spending
- **Recent Bookings** — their reservation history

This information helps provide personalized service to returning guests.

---

## Operations Hub

Navigate to **Operations** for a centralized view of daily tasks. This page combines multiple functions in one place with tabs:

| Tab              | What You Can Do                |
| ---------------- | ------------------------------ |
| **Orders**       | View and manage on-site orders |
| **Housekeeping** | Room status and cleaning       |
| **Maintenance**  | Work orders and repairs        |
| **Staff**        | View who's on duty             |

---

## Restrictions Summary

| Area             | What Staff CAN Do                     | What Staff CANNOT Do            |
| ---------------- | ------------------------------------- | ------------------------------- |
| **Bookings**     | View, check-in, check-out, edit notes | Cancel bookings, modify pricing |
| **Guests**       | View profiles and history             | Edit guest accounts             |
| **Housekeeping** | Update room status, assign tasks      | —                               |
| **Maintenance**  | Create and update tickets             | Close completed tickets         |
| **Orders**       | View and create orders                | Modify prices or refunds        |
| **Finance**      | —                                     | **Cannot access**               |
| **Settings**     | —                                     | **Cannot access**               |
| **Plugins**      | —                                     | **Cannot access**               |
| **Staff**        | —                                     | **Cannot access**               |
| **Rooms**        | —                                     | **Cannot access**               |

---

## Mobile App (PWA)

You can use the PWA (Progressive Web App) from your mobile device for daily tasks.

### Installing on Mobile

1. Open the management dashboard in your mobile browser.
2. Use the browser menu to select **Add to Home Screen**.
3. The app icon appears on your home screen for quick access.

### Mobile Tasks

The PWA supports:

- Checking guests in and out
- Viewing housekeeping status
- Creating maintenance tickets
- Looking up guest information

---

## Troubleshooting

### I can't see the Bookings page

- Your account may not have the correct permissions. Contact your Property Manager or Master Admin.

### Housekeeping status won't update

- Refresh the page and try again.
- Check your internet connection.

### I need to access a restricted page

- Ask your Property Manager to update your role.
- If you need temporary access, a Manager can perform the action on your behalf.

---

## Related Guides

- [Property Manager Guide](./property-manager.md) — for manager-level operations
- [Guest Guide](./guest.md) — for the guest experience
