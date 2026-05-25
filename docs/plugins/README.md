# Plugin Documentation Hub

This is the centralized documentation for all 24 SinaiCamps plugins. Each plugin has its own subdirectory with an overview, API reference, configuration guide, and user guide.

## Plugin Categories

### Commerce

| Plugin | Overview | API | Config | User Guide |
|--------|----------|-----|--------|------------|
| [Booking](booking/) | Room reservations, availability calendar, check-in/out | `plugin_booking_bookings` | [Guide](booking/configuration.md) | [Guide](booking/user-guide.md) |
| [Subscriptions](subscriptions/) | Recurring plans, customer billing, MRR tracking | `plugin_subscriptions_*` | [Guide](subscriptions/configuration.md) | — |
| [Paymob](paymob/) | Egyptian payment gateway integration | `plugin_paymob_transactions` | [Guide](paymob/configuration.md) | — |

### Operations

| Plugin | Overview | API | Config | User Guide |
|--------|----------|-----|--------|------------|
| [Housekeeping](housekeeping/) | Cleaning tasks, room status, inspection tracking | `plugin_housekeeping_tasks` | [Guide](housekeeping/configuration.md) | [Guide](housekeeping/user-guide.md) |
| [Maintenance](maintenance/) | Work orders, preventive maintenance, asset tracking | `plugin_maintenance_requests` | [Guide](maintenance/configuration.md) | [Guide](maintenance/user-guide.md) |
| [POS & KDS](pos-kds/) | Point of sale, kitchen display, order management | `plugin_pos_*` | [Guide](pos-kds/configuration.md) | [Guide](pos-kds/user-guide.md) |
| [Inventory & Waste](inventory-waste/) | Stock tracking, waste logging, low stock alerts | `plugin_inventory_*` | [Guide](inventory-waste/configuration.md) | [Guide](inventory-waste/user-guide.md) |
| [Staff Roster](staff-roster/) | Employee scheduling, time clock, shift management | `plugin_staff_roster_*` | [Guide](staff-roster/configuration.md) | [Guide](staff-roster/user-guide.md) |
| [Financial Ops](financial-ops/) | Billing, folios, payment tracking | `plugin_financial_ops_*` | [Guide](financial-ops/configuration.md) | — |
| [Accounting](accounting/) | Ledger, invoices, expense tracking | `plugin_accounting_*` | [Guide](accounting/configuration.md) | — |
| [HR Core](hr-core/) | Employee records, leave requests, timesheets | `plugin_hr_core_*` | [Guide](hr-core/configuration.md) | [Guide](hr-core/user-guide.md) |
| [Activities](activities/) | Guest activities, booking, scheduling | `plugin_activities_*` | [Guide](activities/configuration.md) | [Guide](activities/user-guide.md) |

### CRM & Loyalty

| Plugin | Overview | API | Config | User Guide |
|--------|----------|-----|--------|------------|
| [CRM](crm/) | Contact management, communication history | `plugin_crm_*` | [Guide](crm/configuration.md) | [Guide](crm/user-guide.md) |
| [Guest CRM](guest-crm/) | Guest profiles, preferences, stay history | `plugin_guest_crm_*` | [Guide](guest-crm/configuration.md) | [Guide](guest-crm/user-guide.md) |
| [Loyalty](loyalty/) | Points, tiers, rewards, redemption | `plugin_loyalty_*` | [Guide](loyalty/configuration.md) | [Guide](loyalty/user-guide.md) |
| [Marketing Automation](marketing-automation/) | Campaigns, segments, triggers, analytics | `plugin_marketing_automation_*` | [Guide](marketing-automation/configuration.md) | [Guide](marketing-automation/user-guide.md) |

### Integrations

| Plugin | Overview | API | Config |
|--------|----------|-----|--------|
| [OTA Channel Manager](ota-channel-manager/) | Multi-channel listing sync (Booking.com, Airbnb, Expedia) | `plugin_ota_channel_manager_*` | [Guide](ota-channel-manager/configuration.md) |
| [iCal](ical/) | iCal feed generation for external calendars | `plugin_ical_*` | [Guide](ical/configuration.md) |
| [iCal Import](ical-import/) | Import external iCal feeds into availability | `plugin_ical_import_*` | [Guide](ical-import/configuration.md) |
| [SiteMinder](siteminder/) | SiteMinder channel manager integration | `plugin_siteminder_*` | [Guide](siteminder/configuration.md) |
| [Integrations Hub](integrations/) | External calendar sync, webhook management | `plugin_integrations_*` | [Guide](integrations/configuration.md) |

### Framework

| Plugin | Overview | API |
|--------|----------|-----|
| [Resource](resource/) | Shared resource booking (tables, equipment, venues) | `plugin_resource_listings` |
| [PWA](pwa/) | Progressive web app, offline support, push notifications | `plugin_pwa_*` |
| [Listing Admin](listing-admin/) | Enhanced property listing management | `plugin_listing_admin_*` |
| [Owner](owner/) | Owner portal, revenue dashboard | `plugin_owner_*` |

## Documentation Template

Every plugin doc follows this structure:

1. **README.md** — Overview, features, installation, screenshots
2. **api.md** — API endpoints, schemas, webhooks, error codes
3. **configuration.md** — Setup steps, settings reference, environment variables
4. **user-guide.md** (complex plugins only) — Role-specific workflows, daily operations

## Cross-Cutting Concerns

### Authentication

All plugin API routes require authentication via `api.auth.getSession()`. Routes return 401 without a valid session.

### Tenant Isolation

All plugin data is scoped to `property_id`. Queries MUST include the property context from the authenticated session.

### Rate Limiting

Plugin APIs inherit platform rate limits (30 req/s general prefix).
