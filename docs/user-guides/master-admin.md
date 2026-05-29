# Master Admin Guide

## Role Description

The **Master Admin** is a super administrator with full, unrestricted access to every feature across the SinaiCamps Marketplace platform. Master admins can manage all properties, users, plugins, themes, financials, and global settings.

## How to Get This Role

Master Admin access is assigned by the system administrator during initial setup. It cannot be self-assigned. If you need Master Admin access, contact your platform operator.

The role is stored as `marketplace_master` in the database and grants access to all `/admin` and `/api/master/*` routes.

---

## Dashboard Overview

After logging in at `/en/login`, you are redirected to the admin dashboard at `/en/admin`.

### Sidebar Navigation

The sidebar on the left provides access to all admin sections:

| Menu Item         | Route                           | Description                                                     |
| ----------------- | ------------------------------- | --------------------------------------------------------------- |
| **Overview**      | `/en/admin`                     | Key platform metrics (listings, revenue, guests, system health) |
| **Listings**      | `/en/admin/listings`            | Manage all properties                                           |
| **Accounts**      | `/en/admin/accounts`            | Manage admin accounts                                           |
| **Plugins**       | `/en/admin/plugins`             | Plugin catalog, property associations, submissions              |
| **Commissions**   | `/en/admin/reports/commissions` | Revenue and commission tracking                                 |
| **System Health** | `/en/admin/health`              | Platform health monitoring                                      |
| **Settings**      | `/en/admin/settings`            | Global platform configuration                                   |
| **Setup**         | `/en/admin/setup`               | Initial platform setup wizard                                   |

### Dashboard Widgets

The Overview page displays:

- **Total Listings** — number of properties on the platform
- **Active Listings** — currently active and visible properties
- **Total Revenue** — aggregate platform revenue
- **Revenue Trend** — revenue change indicator (up/down)
- **Active Guests** — currently active guest accounts
- **System Health** — overall platform health percentage
- **Recent Activity** — latest platform events

**Quick Actions** on the dashboard:

- **Verify Domains** — runs a domain verification check across all custom domains
- **Broadcast Notice** — sends a platform-wide notification to all users

---

## Managing Properties

Navigate to **Listings** in the sidebar to view all properties on the platform.

### Viewing Properties

The listings page shows a table or grid of all properties with:

- Property name
- Slug (URL identifier)
- Plan tier (Basic, Premium, Ultimate)
- Active status
- Actions (edit, configure)

### Creating a New Property

1. Click the **+ Add Property** button (labeled "Add Listing").
2. Fill in the form:
   - **Name** — the display name for the property
   - **Slug** — URL-friendly identifier (auto-generated from name)
   - **Template** — optional shop frontend template
3. Click **Submit** to create the property.

### Editing a Property

1. Click on a property name or the **Edit** action.
2. You can manage:
   - **Configuration** — plan, domain, settings
   - **Plugins** — which plugins are enabled for this property
3. Navigate to `/en/admin/listings/[id]/config` for detailed configuration.

### Activating / Deactivating a Property

Toggle the active status on the listings page. Inactive properties are hidden from public search and cannot accept bookings.

---

## Managing Users

Navigate to **Accounts** in the sidebar to manage admin-level users.

### Viewing Admin Accounts

The accounts page lists all administrator accounts with:

- Name
- Email
- Role (master, super_admin, listing_admin, support, disabled)
- Status (active / disabled)
- Assigned Listings count
- Last login timestamp

### Creating an Admin Account

1. Click the **+ Add Admin** button.
2. Enter the admin's name, email, and select a role.
3. Click **Create Admin** to send an invitation.

### Disabling an Admin Account

Click the **Disable** action on any active admin to revoke their access. Disabled accounts retain their data but cannot log in.

<Callout type="note">
**Note:** The Accounts page manages platform administrators only. To manage property-level staff (managers and staff members), use the **Staff** section inside each property's management dashboard.
</Callout>

---

## Plugin Management

Navigate to **Plugins** in the sidebar. Plugin management operates at two levels:

### Global Level — `/en/admin/plugins`

The plugins page has three views:

**Catalog View** — All available plugins in a grid with:
- Plugin name and description
- Version number
- Active/Inactive toggle (enable/disable globally)
- Category badge
- Review status

Click **Toggle** to enable or disable a plugin across the entire platform.

**Properties View** — Shows which plugins are associated with which properties. Filter by property to see its plugin configuration.

**Submissions View** — Community plugin submissions with status:
- **Pending** — awaiting review
- **Approved** — accepted into the catalog
- **Rejected** — not accepted

### Per-Property Level — `/en/admin/listings/[id]/config`

Configure which plugins are enabled for a specific property:

1. Navigate to **Listings** → click a property → **Configuration**.
2. Scroll to the **Plugins** section.
3. Toggle plugins on or off for this property only.

A plugin must be active globally (Catalog view) before it can be enabled for individual properties.

---

## Impersonation

Master Admins can temporarily log in as a property owner to view their dashboard and troubleshoot issues:

1. Navigate to **Listings** → click a property.
2. Click **Login as Owner**.
3. You are redirected to the property's owner dashboard.
4. An **impersonation banner** appears at the top of the page, showing "Logged in as [owner name]".
5. Perform actions as the owner (view bookings, check settings, etc.).
6. Click **Exit Impersonation** on the banner to return to your admin session.

All impersonation sessions are logged in `audit_logs`.

---

## Metrics & Monitoring

### Prometheus Metrics

The platform exposes application metrics in Prometheus text format:

```
GET /api/metrics
Authorization: Bearer <METRICS_TOKEN>
```

Available metrics (all prefixed with `sinaicamps_`):

| Metric | Type | Description |
|--------|------|-------------|
| `sinaicamps_http_requests_total` | Counter | Total HTTP requests by method and route |
| `sinaicamps_http_request_duration_ms` | Histogram | Request duration in milliseconds |
| `sinaicamps_db_query_duration_ms` | Histogram | Database query duration |
| `sinaicamps_db_errors_total` | Counter | Database error count |
| `sinaicamps_plugin_crashes_total` | Counter | Plugin crash count |
| `sinaicamps_plugin_hook_duration_ms` | Histogram | Hook execution duration |

### System Health

The admin dashboard's **System Health** page displays:
- Database connectivity status
- Plugin watchdog status per plugin
- Background job queue depth
- Memory and uptime

---

## Theme Management

Themes are managed at the property level:

1. Navigate to a property's configuration page.
2. Look for the **Theme** or **Branding** section.
3. Select an available theme from the dropdown.
4. Save changes.

Available themes are stored in the `themes/` directory and include:

- **camp-classic** — default hospitality theme
- **starter** — minimal starting point for custom themes

For theme development, see the [Theme Developer Guide](../../THEME_DEVELOPER_GUIDE.md).

---

## Financial Oversight

Navigate to **Commissions** in the sidebar to view platform-wide financial data.

### Commission Reports

The page shows:

- **Total Fees Collected** — aggregate commission revenue
- **Pending Payouts** — commissions awaiting disbursement
- **Average Commission** — average commission rate across all properties

The report table shows per-property:

- Shop name
- Booking volume
- Commission earned
- Commission rate
- Payout status (paid, pending, processing)

Use the **Export CSV** button to download financial data.

### Data Sources

Financial data comes from:

- `commission_transactions` table — individual commission records
- `payout_summaries` table — aggregated payout data

---

## Audit Logs

The platform tracks all significant events in the `audit_logs` table. While there's no dedicated audit log viewer page yet, audit data can be queried directly from the database or via API endpoints.

Events logged include:

- User creation and role changes
- Property creation and updates
- Plugin installations
- Financial transactions
- Login attempts

---

## Build Queue

The `build_queue` table tracks frontend rebuild requests for legacy Cloudflare Pages deployments. With the current architecture (tenant frontends served by the same Next.js app), builds are no longer required — changes take effect immediately on next page load.

---

## Settings

Navigate to **Settings** in the sidebar to configure global platform behavior.

### General Settings

- Platform name and description
- Default locale and timezone
- Contact information

### Marketplace Identity

- Brand name
- Logo and favicon
- Default branding colors

### Homepage Layout

- Hero section content and images
- Featured listings configuration
- Category display settings

### Payment Gateways

- Stripe integration settings
- Commission rate configuration
- Payout schedule

### Security & Auth

- Session timeout
- Password policy
- Two-factor authentication settings

### Mobile & PWA

- PWA manifest settings
- Mobile app configuration

### Backup & Data

- Database backup schedule
- Data retention policies

---

## Troubleshooting

### A property is not appearing in search

1. Check that the property is **Active** on the listings page.
2. Verify the property has a **Basic** plan or higher (inactive plans hide listings).
3. Check that required plugins (especially `booking`) are enabled for the property.

### A user cannot log in

1. Check the user's account status on the Accounts page.
2. Verify the user has the correct role assigned.
3. Check the `sessions` table or logs for authentication errors.
4. Reset the user's password if necessary.

### A plugin is not working

1. Verify the plugin is **Active** in the Plugins catalog.
2. Check that the plugin is installed for the specific property.
3. Look for errors in the platform logs.
4. Try toggling the plugin off and on.

### Custom domains not resolving

1. Use the **Verify Domains** quick action on the dashboard.
2. Check the DNS configuration for the domain.
3. Verify the domain is set in the property's settings.
4. Ensure the property has an **Ultimate** plan (custom domains require Ultimate).

---

## Related Guides

- [Property Manager Guide](./property-manager.md) — for day-to-day property operations
- [Property Owner Guide](./property-owner.md) — for property owners
- [Plan Comparison](./plan-comparison.md) — plan tier details and feature matrix
