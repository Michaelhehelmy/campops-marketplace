# SinaiCamps Documentation

Welcome to the SinaiCamps marketplace documentation. This is the central knowledge base for the platform.

## Documentation Structure

### Core Platform Docs

| Section | Description |
|---------|-------------|
| [API Reference](core/api/) | Complete API endpoint documentation with examples |
| [Architecture](architecture/) | System architecture, data flow, multi-tenancy |
| [Developer Guide](development/) | Plugin development, SDK reference, best practices |
| [Deployment](deployment/) | Installation, configuration, operations |

### User Guides

| Guide | Audience |
|-------|----------|
| [Master Admin](user-guides/master-admin.md) | Platform administrators |
| [Property Manager](user-guides/property-manager.md) | Property owners/managers |
| [Staff](user-guides/staff.md) | Staff members |
| [Guest](user-guides/guest.md) | End guests |

### Plugin Documentation Hub

All 24 plugins documented in the [Plugin Hub](plugins/):

| Category | Plugins |
|----------|---------|
| **Commerce** | [booking](plugins/booking/), [subscriptions](plugins/subscriptions/), [paymob](plugins/paymob/) |
| **Operations** | [housekeeping](plugins/housekeeping/), [maintenance](plugins/maintenance/), [pos-kds](plugins/pos-kds/), [inventory-waste](plugins/inventory-waste/), [staff-roster](plugins/staff-roster/), [activities](plugins/activities/), [financial-ops](plugins/financial-ops/), [accounting](plugins/accounting/) |
| **CRM & Loyalty** | [crm](plugins/crm/), [guest-crm](plugins/guest-crm/), [loyalty](plugins/loyalty/), [marketing-automation](plugins/marketing-automation/) |
| **Integrations** | [ota-channel-manager](plugins/ota-channel-manager/), [ical](plugins/ical/), [ical-import](plugins/ical-import/), [siteminder](plugins/siteminder/), [integrations](plugins/integrations/) |
| **HR** | [hr-core](plugins/hr-core/) |
| **Framework** | [resource](plugins/resource/), [pwa](plugins/pwa/), [listing-admin](plugins/listing-admin/), [owner](plugins/owner/) |

## Quick Links

- **API Base**: `https://sinaicamps.com/api`
- **OpenAPI Spec**: `docs/openapi.json` (auto-generated)
- **Interactive Docs**: `/docs` when running the app
- **Health Check**: `GET /api/health`
