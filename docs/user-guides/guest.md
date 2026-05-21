# Guest Guide

## Role Description

As a **Guest**, you can browse properties, book stays, manage your trips, and communicate with properties. This guide covers everything you need to know from searching for a camp to checking out.

## Creating an Account

You can create an account during the booking process or by registering directly.

### Registration During Booking

1. Search for a property and select your dates.
2. When you proceed to book, you'll be prompted to sign in or create an account.
3. Fill in your name, email, and create a password.
4. Complete your booking.

### Direct Registration

1. Navigate to the login page at `/en/login`.
2. Click the **Register Your Property** link (for property owners) or find the sign-up link.
3. Fill in the required information.

---

## Browsing Listings

### Searching for Properties

Navigate to the **Search** page at `/en/search` or use the search bar on the homepage.

The search form allows you to filter by:

| Field           | Description                            |
| --------------- | -------------------------------------- |
| **Destination** | Location or property name              |
| **Check-In**    | Arrival date                           |
| **Check-Out**   | Departure date                         |
| **Adults**      | Number of adult guests                 |
| **Children**    | Number of children                     |
| **Currency**    | Display currency (USD, EUR, GBP, etc.) |

Click **Search** to see available properties matching your criteria.

### Viewing a Property

Click on a property card to see its detail page at `/en/stay/[slug]`. The property detail page shows:

- **Photos** — image gallery of the property
- **Description** — about the property
- **Location** — city and country
- **Amenities** — available facilities and services
- **Rating** — guest reviews and ratings
- **Pricing** — nightly rates and availability

---

## Making a Booking

### Step-by-Step Booking Process

1. **Find your property** — Use the search page to find available properties.
2. **Select dates** — Choose your check-in and check-out dates.
3. **Select accommodation** — If applicable, choose a room type.
4. **Review your booking** — The summary page at `/en/book/summary` shows your:
   - Selected property
   - Check-in and check-out dates
   - Duration of stay
   - Total price
   - Payment method (Card or PayPal)
5. **Confirm and pay** — Complete your booking with payment.
6. **Confirmation** — You'll receive a booking confirmation with your reference number.

### Booking Summary Page

The booking summary page (`/en/book/summary`) displays:

- **Confirmed Description** — details of your upcoming stay
- **Search More** — option to search for additional properties
- **Edit Details** — modify your booking before confirming
- **Payment Method** — choose between Card and PayPal
- **Check-In / Check-Out** — dates of your stay
- **Duration** — number of nights
- **Per Night** — nightly rate breakdown

---

## Managing Bookings

### Viewing Your Trips

Navigate to **My Trips** at `/en/guest/reservations` or click **Trips** in the guest navigation.

Your trips are displayed as cards showing:

- Property name (e.g., "Safari Camp, Maasai Mara, Kenya")
- Check-in and check-out dates
- Number of guests
- Total price
- Status badge:
  - **Confirmed** — booking is active and upcoming
  - **Checked In** — you are currently staying
  - **Checked Out** — stay is complete
  - **Cancelled** — booking was cancelled
  - **Pending** — awaiting confirmation

### Viewing a Specific Reservation

Click on a reservation card to see full details at `/en/guest/reservations/[id]`.

### Cancelling a Booking

1. Navigate to **My Trips**.
2. Find the booking you want to cancel.
3. Look for the cancel option (availability depends on the property's cancellation policy).
4. Confirm the cancellation.

---

## Payment Methods

The platform supports the following payment methods:

- **Card** — credit or debit card payments
- **PayPal** — PayPal account payments

Payment status is shown on each booking:

- **Paid** — payment completed successfully
- **Pending** — awaiting payment confirmation
- **Refunded** — payment returned (for cancelled bookings)

---

## Profile Management

Navigate to **Profile** at `/en/guest/profile` to manage your account.

### Personal Information Tab

Update your:

- **Full Name**
- **Email Address**
- **Phone Number**
- **Bio** — a short description about yourself
- **Location** — your city or region

Click **Save** to apply changes.

### Account Settings

The profile also allows you to manage:

- Notification preferences
- Privacy settings
- Account security

---

## Notifications

You may receive notifications from properties, including:

- Booking confirmation
- Check-in reminders
- Special offers and promotions
- Messages from property staff

Notification settings can be managed from your profile page.

---

## Leaving Reviews

After your stay, you may be invited to leave a review. Reviews help other guests make informed decisions and provide valuable feedback to property managers.

To leave a review:

1. Navigate to your completed stay in **My Trips**.
2. Look for the **Leave a Review** option.
3. Rate your stay and add comments.

---

## Guest Dashboard

The guest dashboard at `/en/guest` provides a personalized overview:

**Main Section:**

- Welcome message with your name
- Quick actions: **View Itinerary**, **Manage Profile**
- Upcoming and past trips

**Sidebar:**

- **Pro Status** — loyalty program status and points (if the loyalty plugin is enabled)
- **Favorites** — saved properties for quick access
- **Recent Activity** — your recent interactions

### Guest Navigation

The header navigation includes:

- **Trips** — all your reservations
- **Orders** — on-site orders (if applicable)
- **Following** — properties you follow
- **Notifications** — alert bell with unread count
- **Profile** — your account menu

---

## Mobile App (PWA)

The platform supports Progressive Web App (PWA) installation on your mobile device.

### Installing on Mobile

1. Open the marketplace in your mobile browser (Chrome on Android, Safari on iOS).
2. Look for the **Install App** prompt or use the browser menu.
3. Select **Add to Home Screen**.
4. The app icon appears on your home screen.

### Benefits

- Faster access to the platform
- Mobile-optimized experience
- Push notifications for booking updates
- Quick check-in from your phone

---

## Troubleshooting

### I can't log in

1. Click **Forgot Password** on the login page to reset your password.
2. Check your email for the reset link.
3. If you still can't log in, contact the property or platform support.

### My booking is not showing

1. Check that you are logged in with the correct email address.
2. Navigate to **My Trips** to see all reservations.
3. If it's still missing, contact the property manager.

### Payment was declined

1. Try a different payment method (Card vs PayPal).
2. Check that your card has sufficient funds.
3. Contact your bank if the issue persists.

### I need to change my booking dates

1. Navigate to **My Trips** and find your booking.
2. If the property allows modifications, you'll see an edit option.
3. Otherwise, contact the property manager directly.

---

## Related Guides

- [Property Manager Guide](./property-manager.md) — how property managers handle bookings
- [Staff Guide](./staff.md) — for on-site operations
