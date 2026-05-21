# Property Owner Guide

## Role Description

A **Property Owner** owns one or more properties on the CampOps Marketplace. Unlike Property Managers who handle day-to-day operations, Owners focus on financial performance, plan management, and high-level property oversight.

## How to Get This Role

Property Owner access is gained through the self-service onboarding flow. Navigate to **List Your Camp** at `/en/list-your-camp` to begin the registration process.

---

## Onboarding Flow

When you first register as a property owner, you'll complete a 4-step setup process:

### Step 1: Account (`/en/list-your-camp`)

Create your account:

1. Enter your **Full Name**.
2. Enter your **Email Address**.
3. Create a **Password** (minimum 8 characters).
4. Click **Next** to proceed.

Your information is saved locally as you move through the steps.

### Step 2: Branding (`/en/list-your-camp/branding`)

Set up your property's identity:

- **Property Name** — your camp, hotel, or lodge name
- **Description** — a brief description of your property
- **Location** — city and country
- **Currency** — your preferred currency
- **Logo and images** — upload your branding

### Step 3: Plan (`/en/list-your-camp/plan`)

Choose your plan tier:

- **Basic** — essential features to get started
- **Premium** — advanced features for growing businesses
- **Ultimate** — full features with custom domain support

See the [Plan Comparison](./plan-comparison.md) guide for detailed feature breakdowns.

### Step 4: Done (`/en/list-your-camp/success`)

Your property is registered! You'll be redirected to your property dashboard where you can start configuring your listing.

---

## Dashboard Overview

The owner dashboard at `/en/owner/dashboard` provides high-level financial and operational metrics.

### Sidebar Navigation

The owner portal sidebar includes:

| Menu Item       | Route                 | Description                    |
| --------------- | --------------------- | ------------------------------ |
| **Dashboard**   | `/en/owner/dashboard` | Key metrics and overview       |
| **My Property** | `/en/owner/property`  | Edit property details and plan |
| **Bookings**    | `/en/owner/bookings`  | View booking activity          |
| **Revenue**     | —                     | Financial performance          |

Plugin menu items may also appear in the sidebar if installed.

### Dashboard Metrics

The dashboard shows:

- **Upcoming Bookings** — number of future reservations
- **Total Revenue** — aggregate earnings
- **Occupancy Rate** — percentage of rooms occupied
- **Plan Level** — your current plan with upgrade option

If you are on a **Basic** plan, you'll see an **Upgrade** link next to your plan label.

---

## Plan Management

### Viewing Your Plan

Your current plan is displayed on the dashboard and property page. Click on the plan label to see upgrade options.

### Upgrading Your Plan

1. Navigate to **My Property** at `/en/owner/property`.
2. Find the **Plan** section.
3. Click **Upgrade** to see available plans.
4. Select your desired plan and confirm.

Upgrading takes effect immediately. See the [Plan Comparison](./plan-comparison.md) for what each plan includes.

### Downgrading

Downgrading may affect available features:

- Plugins tied to higher-tier plans will be disabled
- Custom domain support requires Ultimate
- Advanced analytics require Premium or higher

Contact platform support to downgrade your plan.

---

## Property Management

### Editing Property Details

Navigate to **My Property** to update:

- **Name** — display name for your property
- **Description** — description shown on listing pages
- **City / Country** — your property's location
- **Currency** — USD, EUR, GBP, AED, EGP, SAR, or ZAR
- **Type** — camp, hotel, glamping, lodge, resort, or villa

Click **Save** to apply changes.

### Custom Domain Setup

If you have an **Ultimate** plan, you can set up a custom domain:

1. Navigate to **My Property**.
2. Scroll to the **Domain** section.
3. Enter your domain name (e.g., `mycamp.com`).
4. Configure your DNS to point to the platform.
5. Click **Verify Domain** to confirm the setup.

<Callout type="info">
**DNS Configuration:** You'll need to add a CNAME record pointing your domain to the platform's domain. Specific DNS instructions are provided in the settings page.
</Callout>

### Subdomain

Every property gets a subdomain on the platform (e.g., `safari-camp.marketplace.com`). This works on all plans and requires no configuration.

---

## Listing Performance

Your property's performance can be tracked through:

- **Dashboard metrics** — key stats at a glance
- **Bookings page** — detailed booking activity
- **Marketplace Analytics** — advanced distribution metrics

### Key Metrics to Monitor

| Metric                   | What It Tells You         |
| ------------------------ | ------------------------- |
| **Occupancy Rate**       | How full your property is |
| **Total Revenue**        | Your earnings over time   |
| **Upcoming Bookings**    | Future demand             |
| **Average Nightly Rate** | Pricing effectiveness     |

---

## Payouts and Commissions

### How Commissions Work

The platform charges a commission on each booking. The commission rate depends on your plan tier:

| Plan         | Commission Rate |
| ------------ | --------------- |
| **Basic**    | Standard rate   |
| **Premium**  | Reduced rate    |
| **Ultimate** | Lowest rate     |

Commission is calculated as a percentage of the booking total and is deducted before payouts.

### Receiving Payouts

Payouts are processed according to the platform's payout schedule. You can view:

- **Payout summaries** in the Finance section
- **Commission reports** showing per-booking fees
- **Payout status** (pending, processing, paid)

### Payout Summaries

Payout summaries track aggregated financial data including:

- Total booking revenue
- Platform commissions deducted
- Net payout amount
- Payout status and dates

---

## Multiple Properties

If you own multiple properties:

1. Each property has its own dashboard at `/en/manage/[id]`.
2. Switch between properties using the owner portal.
3. Each property can be on a different plan tier.
4. Financial reports are per-property.

---

## Troubleshooting

### My property is not appearing in search

1. Check that your property is set to **Active** in settings.
2. Verify you have an active plan (Basic or higher).
3. Make sure the **booking plugin** is enabled.

### I can't access a feature

1. Check your plan tier — some features require Premium or Ultimate.
2. Verify the required plugin is installed and active.
3. Contact platform support if the issue persists.

### My payout is delayed

1. Check the payout status in your financial reports.
2. Verify your payment details are up to date.
3. Contact platform support for payout inquiries.

### I want to delete my property

1. Contact platform support — property deletion is handled by Master Admins.
2. Ensure all outstanding bookings are resolved before deletion.

---

## Related Guides

- [Property Manager Guide](./property-manager.md) — for day-to-day operations
- [Plan Comparison](./plan-comparison.md) — detailed plan features
- [Master Admin Guide](./master-admin.md) — for platform-level support
