# SinaiCamps Marketplace — User Guides

Welcome to the SinaiCamps Marketplace platform. This documentation covers every user role on the platform — from guests browsing campsites to master administrators managing the entire system.

## Platform Overview

SinaiCamps Marketplace is a white-label, multi-tenant hospitality platform. It powers public listing sites, property owner dashboards, and fully branded tenant shop frontends — all driven by a plugin ecosystem.

The platform is accessible at your marketplace domain (e.g., `https://marketplace.yourdomain.com`) and supports custom domains for ultimate-tier properties (e.g., `https://acaciacamp.com`).

## User Roles

| Role                 | Description                                                                                 | Guide                                           |
| -------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Master Admin**     | Full platform access — manage all properties, users, plugins, settings, and financials.     | [Master Admin Guide](./master-admin.md)         |
| **Property Manager** | Manages day-to-day operations of one or more properties — bookings, rooms, staff, finances. | [Property Manager Guide](./property-manager.md) |
| **Staff**            | Limited access for daily operations — check-ins, housekeeping, maintenance, guest lookup.   | [Staff Guide](./staff.md)                       |
| **Guest**            | End customer — browse listings, book stays, manage trips, and communicate with properties.  | [Guest Guide](./guest.md)                       |
| **Property Owner**   | Owns one or more properties — financial oversight, plan management, listing performance.    | [Property Owner Guide](./property-owner.md)     |

## Quick Start — How to Log In

1. Navigate to your marketplace URL (e.g., `https://marketplace.yourdomain.com/en`).
2. Click **Sign In** in the top navigation or go directly to `/en/login`.
3. Enter your email address and password.
4. After signing in, you'll be redirected to the appropriate dashboard based on your role:
   - **Master Admin** → `/en/admin`
   - **Manager / Staff** → `/en/manage/[property-id]` or `/en/owner/dashboard`
   - **Guest** → `/en/guest`

## Which Guide Should I Read?

| If you are...                                            | Read this guide                                 |
| -------------------------------------------------------- | ----------------------------------------------- |
| A platform administrator managing multiple properties    | [Master Admin Guide](./master-admin.md)         |
| A property manager handling daily operations             | [Property Manager Guide](./property-manager.md) |
| A staff member doing check-ins, cleaning, or maintenance | [Staff Guide](./staff.md)                       |
| A guest looking to book a stay                           | [Guest Guide](./guest.md)                       |
| A property owner tracking revenue and plans              | [Property Owner Guide](./property-owner.md)     |
| Comparing platform plans to choose the right one         | [Plan Comparison](./plan-comparison.md)         |

## Need Help?

- For password resets, contact your platform administrator.
- For technical issues, refer to the [docs/](../../docs/) directory for technical documentation.
- For plugin development, see the [Plugin Developer Guide](../../PLUGIN_DEVELOPER_GUIDE.md).
