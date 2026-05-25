# OpenCode Documentation Phase Prompt

## Executive Summary

**Goal**: Create comprehensive documentation for SinaiCamps marketplace  
**Scope**: **TWO DISTINCT DOCUMENTATION SYSTEMS**:
1. **Core Platform Documentation** — Marketplace, tenant system, backend architecture
2. **Plugin Documentation** — Individual plugin docs, all centralized in one location  
**Target Audience**: Master admins, property managers, staff members, guests, developers, DevOps  
**Deliverable**: Interactive documentation site + offline guides

**Current State**: 
- ✅ All 24 plugins production-ready
- ✅ Performance optimized
- ❌ No comprehensive documentation

**Target State**:
- ✅ **Core Docs**: Marketplace platform, tenant system, backend architecture
- ✅ **Plugin Docs Hub**: All 24 plugins documented in one centralized location
- ✅ OpenAPI spec auto-generated from code
- ✅ 4 user role guides (Master/Manager/Staff/Guest)
- ✅ Interactive API documentation
- ✅ Developer onboarding guide
- ✅ Architecture documentation
- ✅ Deployment & operations guide

---

## Documentation Architecture (Two-Tier System)

### **Tier 1: Core Platform Documentation**
Location: `/docs/core/` or root docs
- Marketplace platform architecture
- Tenant system & multi-tenancy
- Backend API (core routes only)
- User guides (Master Admin, Property Manager, Staff, Guest)
- Deployment & operations
- Developer guides

### **Tier 2: Plugin Documentation Hub**
Location: `/docs/plugins/` (centralized)
- All 24 plugins documented in ONE location
- Clear separation: plugin docs are NOT mixed with core docs
- Each plugin has its own subdirectory
- Plugin-specific APIs, configuration, usage guides

---

## Phase 1: Core Platform API Documentation (Priority: CRITICAL)

**Agents**: @backend_architect + @tech_writer  
**Location**: `/docs/core/api/`

### 1.1 OpenAPI Spec Auto-Generation

**Create Generator** (`scripts/generate-api-docs.ts`):

```typescript
#!/usr/bin/env tsx
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

// Import all schemas from the app
import * as bookingSchemas from '@/plugins/booking/src/schemas';
import * as housekeepingSchemas from '@/plugins/housekeeping/src/schemas';
import * as posSchemas from '@/plugins/pos-kds/src/schemas';
// ... etc

async function generateOpenAPISpec() {
  const spec: OpenAPIObject = {
    openapi: '3.0.3',
    info: {
      title: 'SinaiCamps Marketplace API',
      version: '1.0.0',
      description: 'Multi-tenant hospitality marketplace platform API',
      contact: {
        name: 'SinaiCamps Support',
        url: 'https://sinaicamps.com/support',
        email: 'support@sinaicamps.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://sinaicamps.com',
        description: 'Production server'
      },
      {
        url: 'https://staging.sinaicamps.com',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development'
      }
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for plugin integrations'
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User login, logout, session management' },
      { name: 'Tenants', description: 'Tenant resolution and management' },
      { name: 'Properties', description: 'Property/Listing CRUD operations' },
      { name: 'Bookings', description: 'Booking management and availability' },
      { name: 'Housekeeping', description: 'Cleaning and room status management' },
      { name: 'POS', description: 'Point of sale and kitchen display' },
      { name: 'Staff', description: 'Employee and roster management' },
      { name: 'Inventory', description: 'Stock and waste tracking' },
      { name: 'OTA', description: 'Online travel agency integrations' },
      { name: 'Plugins', description: 'Plugin management and configuration' },
      { name: 'Analytics', description: 'Reporting and analytics' }
    ]
  };

  // Extract routes from route files
  const routeFiles = await glob('src/app/api/**/route.ts');
  const pluginRoutes = await glob('plugins/*/src/routes/*.ts');
  
  for (const file of [...routeFiles, ...pluginRoutes]) {
    const routeInfo = await extractRouteInfo(file);
    if (routeInfo) {
      spec.paths[routeInfo.path] = routeInfo.operations;
    }
  }

  // Add schemas
  spec.components.schemas = {
    ...extractZodSchemas(bookingSchemas),
    ...extractZodSchemas(housekeepingSchemas),
    ...extractZodSchemas(posSchemas),
    // ... etc
    Error: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
        code: { type: 'string' },
        details: { type: 'object' }
      },
      required: ['error', 'message']
    }
  };

  // Write spec
  await fs.writeFile(
    path.join(process.cwd(), 'docs/openapi.json'),
    JSON.stringify(spec, null, 2)
  );

  // Generate markdown version
  await generateMarkdownDocs(spec);
  
  console.log('✅ API documentation generated');
}

async function extractRouteInfo(filePath: string) {
  // Parse route file to extract:
  // - HTTP methods (GET, POST, PATCH, DELETE)
  // - Path parameters
  // - Query parameters
  // - Request body schema (from zod)
  // - Response schemas
  // - Authentication requirements
  
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Extract using AST parsing or regex
  // Return structured route info
}

function extractZodSchemas(schemasModule: Record<string, z.ZodTypeAny>) {
  const schemas: Record<string, any> = {};
  
  for (const [name, schema] of Object.entries(schemasModule)) {
    if (schema instanceof z.ZodType) {
      schemas[name] = zodToJsonSchema(schema, name);
    }
  }
  
  return schemas;
}

generateOpenAPISpec().catch(console.error);
```

### 1.2 Manual API Endpoint Documentation

**Create Structured Docs** (`docs/api/`):

```markdown
<!-- docs/api/authentication.md -->
# Authentication API

## Overview
SinaiCamps uses JWT-based authentication with session management.

## Endpoints

### POST /api/auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "manager-tenant"
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Error Responses:**
- `400` - Invalid email format
- `401` - Invalid credentials
- `429` - Too many attempts

**Example:**
```bash
curl -X POST https://sinaicamps.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword"}'
```

---

### POST /api/auth/logout
Invalidate the current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/session
Get current session information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "manager-tenant"
  },
  "tenant": {
    "id": "tenant-456",
    "name": "Sunrise Resort",
    "plan": "ultimate"
  },
  "permissions": ["bookings.read", "bookings.write", "staff.read"]
}
```
```

---

## Phase 2: User Guides (Priority: HIGH)

**Agents**: @tech_writer + @ux_designer

### 2.1 User Guide Structure

```
docs/user-guides/
├── README.md              # Getting started
├── master-admin.md        # Platform administrator guide
├── property-manager.md    # Property owner/manager guide
├── staff.md               # Staff member operations guide
├── guest.md               # Guest user guide
└── troubleshooting.md     # Common issues and solutions
```

### 2.2 Master Admin Guide

**File**: `docs/user-guides/master-admin.md`

```markdown
# Master Admin Guide

## Overview
As a SinaiCamps platform administrator, you have full control over the marketplace, tenant management, and system configuration.

## Quick Start Checklist
- [ ] Platform setup and configuration
- [ ] First tenant onboarding
- [ ] Plugin ecosystem activation
- [ ] Payment gateway configuration
- [ ] Email/SMS provider setup
- [ ] Analytics and monitoring setup

## Tenant Management

### Creating a New Tenant

1. Navigate to **Master Admin → Tenants → Add New**
2. Fill in tenant details:
   - **Property Name**: The public name
   - **Subdomain**: Unique identifier (e.g., `sunrise-resort`)
   - **Plan**: Basic / Premium / Ultimate
   - **Owner Email**: Admin contact
3. Configure settings:
   - Custom domain (Premium/Ultimate only)
   - Default currency
   - Timezone
   - Language
4. Assign initial plugins
5. Send onboarding email

### Managing Tenant Plans

| Plan | Custom Domain | Plugins | Storage | Support |
|------|--------------|---------|---------|---------|
| Basic | ❌ | 5 max | 1GB | Email |
| Premium | ✅ | 15 max | 10GB | Priority |
| Ultimate | ✅ | Unlimited | 100GB | 24/7 Phone |

### Tenant Suspension/Termination

**Suspension** (temporary):
- Go to tenant settings
- Toggle "Active" to off
- Tenant becomes inaccessible but data preserved

**Termination** (permanent):
⚠️ **WARNING**: This deletes all tenant data permanently
- Export data first: **Tenants → Export Data**
- Initiate termination: **Tenants → Danger Zone → Delete**
- Confirm with 2FA code

## Plugin Management

### Installing Plugins

1. Go to **Master Admin → Plugin Marketplace**
2. Browse available plugins
3. Click "Install" on desired plugin
4. Configure global settings
5. Enable for specific tenants

### Plugin Configuration

Each plugin has configurable options:
- **Global settings**: Apply to all tenants
- **Tenant overrides**: Per-tenant customization
- **Feature flags**: Enable/disable specific features

## System Monitoring

### Dashboard Overview

The admin dashboard shows:
- **Active Tenants**: Total and by plan
- **Revenue**: MRR, ARPU, churn rate
- **System Health**: API response times, error rates
- **Plugin Usage**: Most/least used plugins

### Alert Configuration

Set up alerts for:
- High error rates (>5% in 5 minutes)
- Slow API responses (p95 > 500ms)
- Tenant limit approaching
- Security events (failed logins, suspicious activity)

## Security & Compliance

### Audit Logs

View all administrative actions:
**Master Admin → Security → Audit Logs**

Filter by:
- User
- Action type
- Date range
- Resource affected

### Data Privacy (GDPR)

**Data Export**: Generate complete tenant data export
**Data Deletion**: Permanent removal with confirmation
**Consent Management**: Track user consent for marketing

## Troubleshooting

### Common Issues

**Tenant can't access custom domain:**
1. Check DNS records point to platform
2. Verify SSL certificate status
3. Confirm plan supports custom domains

**Plugin not appearing in tenant:**
1. Check plugin is installed globally
2. Verify tenant plan supports plugin
3. Ensure plugin is enabled for tenant

**High API latency:**
1. Check database connection pool
2. Review slow query logs
3. Verify cache hit rates
```

### 2.3 Property Manager Guide

**File**: `docs/user-guides/property-manager.md`

```markdown
# Property Manager Guide

## Getting Started

Welcome to SinaiCamps! This guide will help you set up and manage your property.

### Onboarding Checklist
- [ ] Complete property profile
- [ ] Upload photos and description
- [ ] Set pricing and availability
- [ ] Configure rooms/units
- [ ] Set up payment methods
- [ ] Invite staff members
- [ ] Test booking flow
- [ ] Go live!

## Property Setup

### Basic Information

Navigate to **Settings → Property Info**:
- **Property Name**: Public-facing name
- **Description**: Detailed description for listings
- **Address**: Full physical address
- **Contact**: Phone, email, WhatsApp
- **Amenities**: Select all that apply (pool, wifi, parking, etc.)

### Photos & Media

**Best Practices**:
- Minimum 10 high-quality photos
- Hero image: 1920x1080px
- Room photos: Individual rooms, bathrooms, amenities
- Use natural lighting
- Show property at its best

**Upload Process**:
1. **Media → Photos → Upload**
2. Drag and drop or select files
3. Add captions for accessibility
4. Set hero image (first photo by default)
5. Organize into galleries

### Room Types

Create room categories:

**Standard Room**:
- Base occupancy: 2 guests
- Max occupancy: 3 guests
- Base price: $100/night
- Amenities: AC, TV, WiFi

**Suite**:
- Base occupancy: 4 guests
- Max occupancy: 6 guests
- Base price: $250/night
- Amenities: AC, TV, WiFi, Kitchenette, Balcony

## Pricing & Availability

### Setting Rates

**Base Rates** (default nightly price):
- Navigate to **Pricing → Base Rates**
- Set per-room-type pricing
- Specify currency

**Seasonal Rates**:
- **Pricing → Seasonal Rates → Add**
- Select date range
- Adjust price multiplier (e.g., 1.5x for peak season)
- Apply to specific room types or all

**Day-of-Week Pricing**:
- Different rates for weekends
- Special weekday discounts
- Holiday surcharges

### Availability Calendar

**Manual Block**:
1. **Calendar → Block Dates**
2. Select room type
3. Choose date range
4. Set reason (maintenance, private event, etc.)

**Bulk Updates**:
- Import from CSV
- Sync with external calendars (iCal)
- API integration for dynamic updates

### Minimum Stay Rules

Set minimum nights required:
- **Default**: 1 night
- **Weekends**: 2 nights
- **Peak Season**: 3 nights
- **Special Events**: Custom rules

## Managing Bookings

### Booking Dashboard

The booking dashboard shows:
- **Today's Check-ins**: Arrivals for today
- **Today's Check-outs**: Departures for today
- **Pending Confirmations**: Awaiting payment/confirmation
- **Upcoming**: Next 7 days

### New Bookings

**From Dashboard**:
1. Click "+ New Booking"
2. Enter guest details
3. Select dates and room
4. Add extras (breakfast, airport pickup)
5. Set payment method
6. Send confirmation

**Channel Manager Bookings**:
Auto-imported from:
- Booking.com
- Airbnb
- Expedia
- Direct website

### Check-in Process

1. **Verify Booking**: Confirm reservation details
2. **ID Verification**: Scan/upload guest ID
3. **Payment**: Collect remaining balance
4. **Room Assignment**: Assign specific room number
5. **Key/Access**: Provide keys or access codes
6. **Welcome**: Share property info, WiFi, amenities

**System Actions**:
- Mark booking as "checked-in"
- Notify housekeeping (room occupied)
- Send welcome SMS/email
- Activate room access

### Check-out Process

1. **Room Inspection**: Check for damage/missing items
2. **Balance Settlement**: Any additional charges
3. **Key Return**: Collect keys/cards
4. **Feedback**: Request review/rating
5. **Departure**: Mark as checked out

**System Actions**:
- Mark booking as "checked-out"
- Create cleaning task for housekeeping
- Send review request email
- Update availability

### Cancellations & Modifications

**Guest Cancellation**:
- View cancellation policy
- Calculate refund amount
- Process refund
- Release room availability
- Send confirmation

**Modification**:
- Change dates (if available)
- Upgrade/downgrade room
- Add/remove guests
- Adjust pricing
- Send updated confirmation

## Guest Communication

### Automated Messages

Configure automatic messages:

**Booking Confirmation** (immediate):
```
Thank you for your booking at {propertyName}!

Reservation: {bookingId}
Dates: {checkIn} to {checkOut}
Room: {roomType}

Check-in: 3:00 PM
Check-out: 11:00 AM

We look forward to welcoming you!
```

**Pre-Arrival** (1 day before):
```
Your stay at {propertyName} starts tomorrow!

Check-in: 3:00 PM
Address: {address}
Contact: {phone}

Need anything? Reply to this message.
```

**During Stay** (day 2):
```
Hope you're enjoying your stay! 

Need restaurant recommendations or activity bookings?
We're here to help!
```

**Post-Checkout** (1 day after):
```
Thank you for staying with us!

Please take a moment to share your experience:
{reviewLink}

We hope to see you again soon!
```

### Manual Messaging

**Individual Messages**:
- **Guests → Select Guest → Message**
- SMS, Email, or WhatsApp
- Template library
- Message history

**Broadcast Messages**:
- All current guests
- Guests checking in today
- VIP guests
- Custom segments

## Staff Management

### Adding Staff

**Staff → Add Member**:
1. Enter email address
2. Select role:
   - **Manager**: Full access except billing
   - **Receptionist**: Bookings, check-in/out
   - **Housekeeping**: Task management only
   - **Maintenance**: Work orders only
3. Set permissions (granular)
4. Send invitation

### Scheduling

**Create Schedule**:
- **Staff → Schedule → Create**
- Select staff member
- Set shift times
- Assign department/role
- Repeat pattern (daily/weekly)

**Time Clock**:
- Staff clock in/out via mobile app
- GPS verification
- Photo verification (optional)
- Automatic timesheet generation

### Payroll

**View Timesheets**:
- **Staff → Timesheets**
- Filter by date range
- Approve/reject entries
- Export to payroll system

**Calculate Pay**:
- Regular hours × hourly rate
- Overtime (1.5x after 40h/week)
- Break deductions
- Export CSV for payroll

## Reports & Analytics

### Dashboard Overview

Key metrics at a glance:
- **Occupancy Rate**: % of rooms booked
- **ADR**: Average Daily Rate
- **RevPAR**: Revenue per Available Room
- **Bookings**: Today / This Week / This Month
- **Revenue**: Total / By Channel / By Room Type

### Financial Reports

**Daily Revenue**:
- Room revenue
- Add-ons (breakfast, extras)
- Taxes collected
- Payment method breakdown

**Monthly Statement**:
- Gross revenue
- Commission (OTA channels)
- Refunds/cancellations
- Net revenue

### Operational Reports

**Housekeeping**:
- Tasks completed today
- Average cleaning time
- Rooms cleaned per housekeeper
- Pending inspections

**Maintenance**:
- Open work orders
- Average resolution time
- Cost by category
- Preventive maintenance schedule

## Advanced Features

### Loyalty Program

**Setup**:
- **Loyalty → Settings**
- Points per dollar spent
- Redemption value
- Tier levels (Bronze/Silver/Gold)

**Guest Enrollment**:
- Automatic on first booking
- Opt-in during checkout
- QR code for sign-up

**Managing Points**:
- Manual adjustments (complaints, special occasions)
- Bonus promotions
- Point expiration rules

### OTA Channel Manager

**Connect Channels**:
- **Integrations → OTA → Add Channel**
- Select provider (Booking.com, Airbnb, etc.)
- Enter API credentials
- Map room types
- Test connection

**Rate Parity**:
- Maintain same rates across channels
- Automatic sync
- Markup for OTA commissions

**Channel-Specific Settings**:
- Different cancellation policies
- Minimum stay requirements
- Lead time restrictions

### API & Webhooks

**API Keys**:
- **Settings → API**
- Generate read/write keys
- Set IP whitelist
- Monitor usage

**Webhooks**:
- Configure endpoints
- Select events (booking, cancellation, etc.)
- Retry logic
- Delivery logs

## Troubleshooting

### Common Issues

**Booking won't confirm:**
- Check payment method validity
- Verify room availability
- Review minimum stay requirements
- Check for conflicting reservations

**OTA booking not showing:**
- Verify channel connection status
- Check sync logs
- Ensure room mapping is correct
- Manual sync if needed

**Staff can't access:**
- Verify invitation was accepted
- Check role permissions
- Ensure 2FA is completed
- Try password reset

### Getting Help

**Support Channels**:
- In-app chat (response within 1 hour)
- Email: support@sinaicamps.com
- Phone: +1-800-SINAI-HELP (Premium/Ultimate)
- Documentation: docs.sinaicamps.com

**Emergency Escalation**:
For critical system issues, call emergency hotline (24/7 for Ultimate plan).
```

### 2.4 Staff Guide

**File**: `docs/user-guides/staff.md`

```markdown
# Staff Operations Guide

## Quick Reference

### Daily Checklist

**Morning Shift (Reception)**:
- [ ] Review today's arrivals (check dashboard)
- [ ] Prepare welcome packets
- [ ] Check room availability
- [ ] Review pending tasks

**Evening Shift (Reception)**:
- [ ] Review tomorrow's arrivals
- [ ] Confirm room assignments
- [ ] Check for maintenance issues
- [ ] Run end-of-day report

**Housekeeping**:
- [ ] Check assigned tasks
- [ ] Complete room cleanings
- [ ] Mark tasks complete in system
- [ ] Report maintenance issues

## Using the Mobile App

### Download & Login

1. Download "SinaiCamps Staff" from App Store / Google Play
2. Enter your property code (ask manager)
3. Log in with email and password
4. Complete 2FA setup (first time)

### Dashboard

**Your assigned tasks** appear on the home screen:
- **Check-ins**: Guests arriving today
- **Cleaning**: Rooms assigned to you
- **Maintenance**: Work orders
- **Messages**: Guest communications

### Time Clock

**Clocking In**:
1. Open app
2. Tap "Clock In"
3. Allow location access (required)
4. Take selfie (if required by property)
5. Confirm department/role

**Clocking Out**:
1. Tap "Clock Out"
2. Review hours worked
3. Confirm
4. Automatic timesheet entry

⚠️ **Must be on property premises to clock in/out**

## Reception Duties

### Guest Check-in

**System Steps**:
1. **Dashboard** → Click arriving guest
2. Verify ID:
   - Tap "Verify ID"
   - Scan or photograph ID
   - Confirm name matches booking
3. Payment:
   - Check balance due
   - Process payment (card/cash)
   - Mark "Payment Complete"
4. Room Assignment:
   - Select available room
   - Assign room number
   - Update key code (if smart locks)
5. Complete Check-in:
   - Tap "Check In"
   - Hand over keys/access
   - Welcome guest!

**Guest Questions**:
- WiFi password: **Settings → Property Info** to view
- Amenities location: **Property Map** in app
- Local recommendations: **Guest Services** section

### Guest Check-out

**System Steps**:
1. **Dashboard** → Click departing guest
2. Room Check:
   - Tap "Room Inspection"
   - Note any damage/missing items
   - Photo documentation
3. Final Payment:
   - Add any incidental charges
   - Process remaining balance
   - Email receipt
4. Complete Check-out:
   - Collect keys/cards
   - Tap "Check Out"
   - Room marked for cleaning

### Handling Walk-ins

**Check Availability**:
1. **+ New Booking**
2. Enter dates
3. Tap "Check Availability"
4. Show available rooms

**Create Booking**:
1. Select room
2. Enter guest details
3. Collect payment
4. Assign room
5. Complete check-in

## Housekeeping Duties

### Daily Task List

**View Tasks**:
- **Housekeeping** tab
- Sorted by priority
- Color-coded:
  - 🔴 Red: Check-out cleaning (urgent)
  - 🟡 Yellow: Stay-over cleaning
  - 🟢 Green: Inspection/turnover
  - ⚪ Gray: Deep clean / special request

### Room Cleaning Workflow

**Check-out Cleaning**:
1. Tap task → "Start Cleaning"
2. Follow checklist:
   - [ ] Strip bed
   - [ ] Trash removal
   - [ ] Bathroom clean
   - [ ] Vacuum/sweep
   - [ ] Make bed
   - [ ] Stock amenities
   - [ ] Wipe surfaces
3. Mark complete → "Cleaned"
4. Move to inspection queue

**Stay-over Service**:
1. Knock and announce: "Housekeeping!"
2. If guest present, ask preferences
3. Quick tidy (make bed, refresh towels)
4. Mark "Completed"

### Reporting Issues

**While Cleaning**:
1. Tap "Report Issue"
2. Select type:
   - Maintenance needed
   - Missing items
   - Damage
   - Pest control
3. Add photo
4. Urgency level
5. Submit

**Manager notified automatically**

## Maintenance Duties

### Work Orders

**View Orders**:
- **Maintenance** tab
- Sorted by priority and age
- Status filter: Open / In Progress / Completed

### Completing Work

**Steps**:
1. Tap work order
2. Review issue details
3. Tap "Start Work"
4. Complete repair
5. Add photos (before/after)
6. Log materials used
7. Tap "Complete"
8. Time automatically logged

### Preventive Maintenance

**Scheduled Tasks**:
- Filter by "Scheduled"
- Weekly/monthly inspections
- Equipment checks
- Filter changes

## Guest Communication

### In-App Messaging

**Access Messages**:
- **Messages** tab
- Shows guest name and room
- Unread indicator

**Replying**:
1. Tap message thread
2. Type response
3. Can use templates
4. Send

**Escalation**:
- For complex issues, tag manager
- Use "@manager" in message
- Or tap "Escalate to Manager"

### Phone Calls

**If Guest Calls**:
- Answer with property name
- Identify yourself
- Log call in system:
  **Messages → Log Call**
  - Guest name
  - Room number
  - Issue/request
  - Resolution

## Reporting & Emergencies

### Incident Reporting

**For Serious Issues**:
1. **Emergency** button (top of app)
2. Select incident type:
   - Guest injury
   - Security concern
   - Property damage
   - Other emergency
3. Add details
4. Photo evidence
5. Submit

**Manager and emergency contacts notified immediately**

### Lost & Found

**Report Item**:
1. **Lost & Found** → "New Item"
2. Photo of item
3. Location found
4. Date found
5. Description
6. Submit to system

**Return Item**:
- Guest claims item
- Verify ID
- Photo of guest receiving
- Mark "Returned"

## Tips & Best Practices

### Reception
- Always confirm guest identity before discussing booking details
- Keep desk organized and professional
- Smile and be welcoming
- Know local attractions and restaurants
- Keep emergency numbers handy

### Housekeeping
- Work efficiently but thoroughly
- If guest in room, be polite and quick
- Report maintenance issues immediately
- Never enter room without announcing
- Lock door when finished

### Maintenance
- Prioritize guest-facing issues
- Keep common areas safe
- Document everything with photos
- Test repairs before marking complete
- Keep tools organized

## Getting Help

**Quick Support**:
- In-app chat with manager
- Property handbook (physical or digital)
- Emergency: Use Emergency button
- Non-urgent: Log support ticket

**Training Resources**:
- Video tutorials in app
- Monthly staff meetings
- Shadow experienced staff
- Property SOP manual
```

### 2.5 Guest Guide

**File**: `docs/user-guides/guest.md`

```markdown
# Guest Guide

## Before Your Stay

### Making a Reservation

**Online Booking**:
1. Visit property website or sinaicamps.com
2. Enter your dates
3. Select room type
4. Enter guest details
5. Choose add-ons (breakfast, airport pickup, etc.)
6. Pay securely online
7. Receive confirmation email

**What You'll Need**:
- Valid email address
- Credit/debit card
- Estimated arrival time
- Special requests (dietary, accessibility, etc.)

### Modifying Your Booking

**Online**:
- Click link in confirmation email
- Or visit property website → "My Booking"
- Log in with booking reference + email
- Change dates, room, or add extras
- Pay any difference

**By Phone**:
- Call property directly
- Have booking reference ready
- Changes subject to availability

### Cancellation Policy

**Standard Policy**:
- Free cancellation up to 48 hours before check-in
- 50% refund within 48 hours
- No refund for no-shows

**Non-Refundable Rates**:
- Lower price but no changes/cancellations
- Clearly marked during booking

## During Your Stay

### Check-in Process

**Standard Check-in**: 3:00 PM

**What to Bring**:
- Valid ID (passport or driver's license)
- Credit card for incidentals
- Booking confirmation (digital or printed)

**At Reception**:
1. Provide name and booking reference
2. Show ID
3. Present credit card
4. Receive:
   - Room key/card
   - WiFi password
   - Property map
   - Welcome information
5. Ask any questions!

**Early Check-in**:
- Subject to room availability
- May incur extra fee
- Call ahead to request

### Your Room

**Room Features**:
Each room includes:
- Private bathroom
- Fresh linens and towels
- TV with cable/streaming
- WiFi access
- Climate control
- Coffee/tea station

**Housekeeping**:
- Daily service for stays >1 night
- Place "Do Not Disturb" sign if you prefer privacy
- Extra towels/toiletries: Call reception or use app

### Amenities

**Common Areas**:
- Swimming pool hours: 7 AM - 10 PM
- Fitness center: 24/7 (key card access)
- Business center: Main lobby
- Parking: Free for guests

**Dining**:
- Breakfast: 7-10 AM (location varies by property)
- Restaurant hours: Check with reception
- Room service: Available (fees apply)
- Nearby restaurants: Ask reception for recommendations

### Using Guest Services

**Mobile App** (if property offers):
1. Download property app or scan QR code in room
2. Log in with booking reference
3. Access:
   - Digital key (smart locks)
   - Messaging with staff
   - Service requests
   - Local recommendations
   - Room service ordering

**Requests**:
- Extra pillows/blankets
- Toiletries
- Maintenance issues
- Local information

**Call Reception** or use in-room phone

### Staying Connected

**WiFi**:
- Network: [PropertyName]_Guest
- Password: Provided at check-in
- Free for all guests

**Phone**:
- Local calls: Free
- Long distance: Charges apply
- Dial 0 for reception
- Dial 9 for outside line

## Dining & Activities

### On-Site Dining

**Breakfast**:
- Continental: Pastries, fruit, coffee
- Full: Eggs, bacon, pancakes, etc.
- Times: Usually 7-10 AM
- Location: Check with reception

**Restaurant**:
- Dinner service typically 6-10 PM
- Reservations recommended
- Ask about daily specials
- Room service available

### Local Attractions

**Ask Reception For**:
- Maps and brochures
- Restaurant recommendations
- Tour bookings
- Transportation options
- Event calendars

**Popular Activities**:
- Sightseeing tours
- Beach/water sports
- Hiking trails
- Shopping areas
- Cultural sites

## Check-out Process

### Standard Check-out: 11:00 AM

**The Night Before**:
- Settle any room charges
- Pack belongings
- Set alarm!

**Check-out Morning**:
1. **Return Keys** to reception
2. **Final Payment** if balance due
3. **Express Check-out** (if available):
   - Leave keys in room
   - Email receipt sent automatically

**Late Check-out**:
- Subject to availability
- Usually charged by hour or half-day
- Request in advance

### After Check-out

**Forgot Something?**
- Call property immediately
- Items held for 30 days
- Shipping available (fee applies)

**Review Your Stay**:
- You'll receive email with review link
- Share your experience
- Photos welcome!

## Payment & Billing

### Accepted Payment Methods

- Credit cards (Visa, MasterCard, AmEx)
- Debit cards
- Cash (some properties)
- Mobile payments (Apple Pay, Google Pay)

### Charges You May See

**Room Rate**:
- Nightly rate × nights
- Taxes (VAT, tourist tax, etc.)

**Extras**:
- Breakfast (if not included)
- Room service
- Minibar
- Phone calls
- Laundry
- Parking (if not free)

**Incidental Hold**:
- $50-200 hold on credit card
- Released after check-out
- May take 3-7 business days to clear

### Receipts

- Email receipt automatically sent
- Available in booking portal
- Paper copy available on request

## Policies & Guidelines

### House Rules

**Quiet Hours**: 10 PM - 7 AM
**Smoking**: Designated areas only (not in rooms)
**Pets**: Only in pet-friendly properties (fees apply)
**Visitors**: Must register at reception
**Parking**: One space per room (additional may incur fee)

### Safety & Security

**In Your Room**:
- Use door lock and chain
- Don't open door to strangers
- Use safe for valuables
- Report suspicious activity

**Emergency**:
- Dial 0 for reception (24/7)
- Emergency exits marked on room door
- Assembly point: [Location]

**Fire Safety**:
- Know two exits from your room
- Don't use elevators in fire
- Follow staff instructions

### Accessibility

**Accessible Features**:
- Wheelchair accessible rooms available
- Elevator access
- Accessible parking
- Visual/hearing assistance available

**Request When Booking**:
- Specific accessibility needs
- Ground floor preference
- Near elevator
- Roll-in shower

## Troubleshooting

### Common Issues

**WiFi Not Working**:
- Try reconnecting with password
- Restart device
- Call reception for assistance
- Use guest network (not staff)

**Room Too Hot/Cold**:
- Check thermostat settings
- Call maintenance if not working
- Extra blankets available

**TV Not Working**:
- Check power and input source
- Try different channels
- Call reception

**Maintenance Issues**:
- Running toilet
- Dripping faucet
- Broken item
→ Report immediately for quick fix

### Emergency Contacts

**Property**:
- Reception: Dial 0
- Emergency: [Phone number]

**Local**:
- Police: 911 (US) / 999 (UK) / 112 (EU)
- Medical: Ask reception
- Taxi: Ask reception

## Tips for a Great Stay

### Before Arrival
- Check weather and pack accordingly
- Confirm check-in time
- Download offline maps
- Save property contact info

### During Stay
- Ask staff for local secrets
- Try the breakfast!
- Respect quiet hours
- Tip housekeeping (optional, appreciated)
- Take photos and tag property

### Departure
- Double-check room for belongings
- Return all keys/cards
- Fill out comment card or online review
- Book your next stay!

## Questions?

**We're Here to Help!**

- Call reception: Anytime
- Visit front desk: 24/7
- Email: [property email]
- App messaging: If property has app

**Feedback Welcome!**
Your experience matters. Share suggestions, compliments, or concerns with management.

---

**Thank you for choosing SinaiCamps!**
We hope you have a wonderful stay.
```

---

## Phase 2.5: Plugin Documentation Hub (Priority: HIGH)

**Agents**: @backend_architect + @tech_writer + all plugin agents  
**Location**: `/docs/plugins/` — **ALL PLUGIN DOCS CENTRALIZED HERE**

**Important**: Plugin documentation is SEPARATE from core platform docs. All 24 plugins documented in ONE centralized hub.

### Plugin Docs Hub Structure

```
docs/plugins/
├── README.md                    # Plugin docs overview & index
├── booking/
│   ├── README.md               # Overview
│   ├── api.md                  # API reference
│   ├── configuration.md        # Setup & settings
│   └── user-guide.md            # Usage for managers/staff
├── housekeeping/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── maintenance/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── pos-kds/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   ├── user-guide.md
│   └── kds-setup.md            # KDS-specific setup
├── inventory-waste/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── staff-roster/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── loyalty/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── crm/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── guest-crm/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── ota-channel-manager/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── ical/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── ical-import/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── integrations/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── siteminder/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── marketing-automation/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── financial-ops/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── accounting/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── hr-core/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── activities/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── subscriptions/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   └── user-guide.md
├── resource/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── pwa/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── paymob/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
├── listing-admin/
│   ├── README.md
│   ├── api.md
│   └── configuration.md
└── owner/
    ├── README.md
    ├── api.md
    └── configuration.md
```

### Plugin Documentation Template

**Every plugin MUST have these 3-4 files**:

#### 1. `README.md` — Plugin Overview

```markdown
# [Plugin Name] Plugin

## Overview
- **Purpose**: What this plugin does
- **Target Users**: Who uses this plugin
- **Dependencies**: Required plugins or core features
- **Plan Availability**: Basic / Premium / Ultimate

## Features
- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Installation
```bash
npm run plugin:install [plugin-id]
```

## Quick Start
1. Enable plugin in tenant settings
2. Configure initial settings
3. Train staff on usage

## Screenshots/Demo
[Include screenshots or demo GIFs]

## Support
- Plugin-specific issues: Check troubleshooting section
- General support: support@sinaicamps.com
```

#### 2. `api.md` — API Reference

```markdown
# [Plugin Name] API Reference

⚠️ **Plugin-Specific API**: These endpoints are provided by the [plugin-name] plugin.

## Base URL
All endpoints prefixed with: `/api/p/[plugin-id]/`

## Authentication
Requires valid JWT token in `Authorization: Bearer <token>` header.

## Endpoints

### GET /api/p/[plugin-id]/items
List all items.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Max items to return (default: 20) |
| offset | integer | No | Pagination offset |
| status | string | No | Filter by status |

**Response (200):**
```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### POST /api/p/[plugin-id]/items
Create new item.

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "status": "active | inactive"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "...",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### PATCH /api/p/[plugin-id]/items/:id
Update existing item.

### DELETE /api/p/[plugin-id]/items/:id
Delete item (soft delete).

## Webhooks

### Emitted Hooks
| Hook | Trigger | Payload |
|------|---------|---------|
| `[PLUGIN].CREATED` | Item created | `{ id, ... }` |
| `[PLUGIN].UPDATED` | Item updated | `{ id, changes, ... }` |
| `[PLUGIN].DELETED` | Item deleted | `{ id }` |

### Consumed Hooks
| Hook | Action |
|------|--------|
| `booking.CREATED` | Create related item |
| `checkout.COMPLETED` | Update status |

## Error Codes
| Code | HTTP | Description |
|------|------|-------------|
| PLUGIN_NOT_ENABLED | 403 | Plugin not enabled for tenant |
| INVALID_STATUS | 400 | Invalid status value |
| ITEM_NOT_FOUND | 404 | Item doesn't exist |
```

#### 3. `configuration.md` — Setup & Settings

```markdown
# [Plugin Name] Configuration

## Prerequisites
- Required user role: `manager-tenant` or `admin`
- Plugin must be enabled in tenant settings
- Dependencies: [list any required plugins]

## Initial Setup

### Step 1: Enable Plugin
1. Go to **Settings → Plugins**
2. Find **[Plugin Name]**
3. Toggle **Enable**
4. Click **Configure**

### Step 2: Configure Settings

**General Settings:**
| Setting | Default | Description |
|---------|---------|-------------|
| enabled | true | Enable/disable plugin |
| auto_sync | false | Enable automatic sync |
| notification_email | - | Email for alerts |

**Advanced Settings:**
| Setting | Default | Description |
|---------|---------|-------------|
| sync_interval | 3600 | Seconds between syncs |
| retention_days | 90 | Days to keep logs |
| debug_mode | false | Enable debug logging |

### Step 3: Permissions

Assign plugin permissions to staff roles:
- `[plugin].read` — View data
- `[plugin].write` — Create/update
- `[plugin].delete` — Delete items
- `[plugin].admin` — Full access including settings

## Environment Variables

Optional environment variables for advanced configuration:

```bash
# .env
PLUGIN_[NAME]_API_KEY=your-api-key
PLUGIN_[NAME]_WEBHOOK_SECRET=your-webhook-secret
```

## Database Schema

Tables created by this plugin:

```sql
CREATE TABLE plugin_[name]_items (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);
```

## Troubleshooting

### Plugin not appearing in menu
- Verify plugin is enabled
- Check user has `[plugin].read` permission
- Clear browser cache

### API returns 403
- Verify plugin is enabled for tenant
- Check user permissions
- Ensure valid JWT token

### Data not syncing
- Check sync interval settings
- Verify webhook endpoints are accessible
- Review logs: **Settings → Logs → [Plugin Name]**
```

#### 4. `user-guide.md` — Usage Instructions (Optional, for complex plugins)

```markdown
# [Plugin Name] User Guide

## For Property Managers

### Daily Operations
1. Access plugin: **Menu → [Plugin Name]**
2. View dashboard overview
3. Perform common tasks

### Managing Items
- Create new: Click **+ New**
- Edit: Click item → **Edit**
- Delete: Click item → **Delete** (or bulk select)
- Search: Use top search bar
- Filter: Use sidebar filters

### Reports
Access reports at: **[Plugin Name] → Reports**

Available reports:
- Daily summary
- Weekly trends
- Monthly analytics

## For Staff

### [Specific Role] Tasks
- Task 1: Step-by-step
- Task 2: Step-by-step

### Mobile App Usage
If mobile app is available:
1. Download app
2. Log in
3. Access [Plugin Name] section

## Best Practices
- Tip 1
- Tip 2
- Tip 3
```

### Plugin Documentation Assignments

| Plugin | Assigned Agent | Priority |
|--------|---------------|----------|
| booking | @plugin_booking | HIGH |
| housekeeping | @plugin_operations | HIGH |
| maintenance | @plugin_operations | HIGH |
| pos-kds | @plugin_operations | HIGH |
| inventory-waste | @plugin_operations | MEDIUM |
| staff-roster | @plugin_operations | MEDIUM |
| loyalty | @plugin_crm | MEDIUM |
| crm | @plugin_crm | MEDIUM |
| guest-crm | @plugin_crm | MEDIUM |
| ota-channel-manager | @plugin_integrations | HIGH |
| ical | @plugin_integrations | MEDIUM |
| ical-import | @plugin_integrations | MEDIUM |
| integrations | @plugin_integrations | MEDIUM |
| siteminder | @plugin_integrations | MEDIUM |
| marketing-automation | @plugin_crm | MEDIUM |
| financial-ops | @plugin_operations | MEDIUM |
| accounting | @plugin_operations | MEDIUM |
| hr-core | @plugin_operations | LOW |
| activities | @plugin_operations | MEDIUM |
| subscriptions | @plugin_operations | MEDIUM |
| resource | @backend_architect | LOW |
| pwa | @frontend_marketplace | MEDIUM |
| paymob | @plugin_payments | MEDIUM |
| listing-admin | @backend_architect | MEDIUM |
| owner | @backend_architect | LOW |

### Plugin Docs Verification

**Each plugin doc must include:**
- [ ] Clear "Plugin-Specific" labeling
- [ ] API endpoints with full examples
- [ ] Configuration steps
- [ ] Required permissions
- [ ] Database schema (if applicable)
- [ ] Troubleshooting section
- [ ] Screenshots/diagrams (where helpful)

---

## Phase 3: Developer Documentation (Priority: HIGH)

**Agents**: @backend_architect + @tech_writer

### 3.1 Architecture Documentation

**File**: `docs/architecture/overview.md`

```markdown
# SinaiCamps Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CDN / Cloudflare                      │
│         (Static Assets, DDoS Protection, SSL)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    Nginx Reverse Proxy                   │
│    (SSL Termination, Rate Limiting, Static File Serve)   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Next.js Application                     │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │  App Router  │   API Routes │   Middleware │        │
│  │  (SSR/SSG)   │   (/api/*)   │   (Auth/I10n)│        │
│  └──────────────┴──────────────┴──────────────┘        │
│                         │                               │
│              ┌──────────┴──────────┐                   │
│              ▼                     ▼                   │
│      ┌──────────────┐    ┌──────────────┐            │
│      │  Plugin SDK  │◄──►│ Plugin Hooks │            │
│      │  (Register)  │    │  (Events)    │            │
│      └──────────────┘    └──────────────┘            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Data Layer                             │
│  ┌──────────────┬──────────────┬──────────────┐        │
│  │   SQLite     │  PostgreSQL  │    Redis     │        │
│  │  (Dev/Test)  │ (Production)│   (Cache)    │        │
│  └──────────────┴──────────────┴──────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

### Tenant Isolation

Each tenant operates in a shared infrastructure with data isolation:

1. **Database**: Single database, row-level tenant filtering
2. **Files**: Tenant-scoped file storage paths
3. **API**: Tenant resolution via hostname/subdomain
4. **Cache**: Tenant-prefixed cache keys

### Tenant Resolution Flow

```
Request → Middleware → Tenant Resolution → Tenant Context → Handler
           (hostname)    (DB lookup)        (headers)      (isolated)
```

### Tenant Data Model

```typescript
interface Tenant {
  id: string;
  subdomain: string;        // unique-identifier
  customDomain?: string;      // customdomain.com (Premium/Ultimate)
  plan: 'basic' | 'premium' | 'ultimate';
  ownerId: string;
  settings: {
    currency: string;
    timezone: string;
    language: string;
    // ...
  };
  branding: {
    logo: string;
    colors: { primary: string; secondary: string };
  };
  plugins: string[];        // Enabled plugin IDs
}
```

## Plugin System

### Plugin Lifecycle

```
Install → Init → Enable → Runtime → Disable → Uninstall
   │        │      │         │         │        │
   ▼        ▼      ▼         ▼         ▼        ▼
 Schema  Tables  Routes   Hooks     Stop    Cleanup
  Check  Seed    UI       Events    API     Remove
```

### Plugin SDK API

```typescript
interface PluginAPI {
  // Database
  db: {
    query: (sql: string, params?: any[]) => Promise<any[]>;
    execute: (sql: string, params?: any[]) => Promise<void>;
    transaction: (fn: (trx: Transaction) => Promise<void>) => Promise<void>;
  };
  
  // Routes
  registerRoute: (path: string, handlers: RouteHandlers) => void;
  
  // UI
  ui: {
    addSlotComponent: (slot: string, component: string) => void;
  };
  
  // Hooks
  hooks: {
    register: (event: string, handler: Function) => void;
    emit: (event: string, data: any) => Promise<void>;
  };
  
  // Auth
  auth: {
    requireAuth: () => Promise<Session>;
    requireRole: (role: string) => Promise<Session>;
  };
}
```

### Hook System

**Event Types**:
- `booking.created` — New booking created
- `booking.cancelled` — Booking cancelled
- `checkin.completed` — Guest checked in
- `checkout.completed` — Guest checked out
- `payment.success` — Payment processed
- `payment.failed` — Payment failed
- `room.status_changed` — Room status updated
- `inventory.low_stock` — Stock below threshold

**Example Hook Registration**:
```typescript
// In plugin init
api.hooks.register('booking.created', async (data) => {
  // Send confirmation email
  await emailService.sendBookingConfirmation(data.guestEmail, data);
  
  // Award loyalty points
  await loyaltyService.addPoints(data.guestId, data.total * 0.1);
  
  // Create housekeeping task
  await housekeepingService.scheduleCheckoutCleaning(data.roomId, data.checkOut);
});
```

## Database Architecture

### Schema Organization

**Core Tables** (platform-level):
- `users` — Authentication and profiles
- `tenants` / `properties` — Tenant data
- `accounts` — OAuth connections
- `verifications` — Email/phone verification
- `audit_logs` — Security auditing
- `marketplace_settings` — Global configuration

**Plugin Tables** (prefixed by plugin):
- `plugin_booking_bookings`
- `plugin_booking_room_availability`
- `plugin_housekeeping_tasks`
- `plugin_pos_orders`
- etc.

### Migrations

Migration files in `src/db/migrations/`:
```
001_initial.sql
002_add_accounts.sql
003_add_verifications.sql
...
013_add_core_indexes.sql
```

**Migration Rules**:
1. Never modify existing migration
2. Always include rollback
3. Test on staging first
4. Document breaking changes

## Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│  User   │────►│  Login Form │────►│  Server  │────►│  Auth   │
└─────────┘     └─────────────┘     └──────────┘     └─────────┘
                                                          │
                                                          ▼
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│ Access  │◄────│  JWT Token  │◄────│  Session │◄────│  Verify │
│ Granted │     │   (Cookie)  │     │  Store   │     │ Password│
└─────────┘     └─────────────┘     └──────────┘     └─────────┘
```

### JWT Structure

```json
{
  "sub": "user-123",           // User ID
  "email": "user@example.com",
  "role": "manager-tenant",     // User role
  "tenant": "tenant-456",      // Current tenant
  "permissions": ["bookings.read", "staff.write"],
  "iat": 1704067200,           // Issued at
  "exp": 1706659200            // Expires (30 days)
}
```

## Deployment Architecture

### Production Stack

```
┌─────────────────────────────────────────┐
│              Load Balancer             │
│          (Cloudflare / AWS ALB)         │
└───────────────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼───────┐       ┌───────▼───────┐
│   App Server  │       │   App Server  │
│   (Next.js)   │       │   (Next.js)   │
└───────┬───────┘       └───────┬───────┘
        │                       │
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │      PostgreSQL         │
        │    (Primary + Replica)   │
        └─────────────────────────┘
```

### Environment Configuration

**Required Variables**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Auth
AUTH_SECRET=your-secret-key

# App
NEXT_PUBLIC_APP_URL=https://sinaicamps.com
NEXT_PUBLIC_API_URL=https://sinaicamps.com/api

# Optional
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_...
SENDGRID_API_KEY=SG...
```

## Performance Optimizations

### Caching Strategy

| Data Type | Cache Type | TTL | Invalidation |
|-----------|-----------|-----|--------------|
| Tenant Config | Memory | 10m | Manual/Update |
| Availability | Memory | 5m | Booking change |
| Static Assets | CDN | 1y | Never |
| API Responses | HTTP | 5m | Varies |
| Session | Memory | 15m | Logout |

### Database Optimization

- **Indexes**: 21 core indexes on hot queries
- **Connection Pooling**: 20 connections max
- **Query Optimization**: No N+1 queries
- **Slow Query Logging**: >200ms alerts

## Security Architecture

### Security Layers

1. **CDN**: DDoS protection, WAF rules
2. **Nginx**: Rate limiting, IP blocking
3. **Middleware**: Auth checks, tenant isolation
4. **API**: Input validation, SQL injection prevention
5. **Database**: Row-level security, parameterized queries

### Data Protection

- **Encryption at Rest**: Database encrypted
- **Encryption in Transit**: TLS 1.3
- **Sensitive Data**: Encrypted columns (API keys, passwords)
- **Audit Logging**: All admin actions logged
- **Backup**: Daily encrypted backups

## Monitoring & Observability

### Metrics Collected

- **API Response Time**: p50, p95, p99
- **Database Query Time**: Per query type
- **Cache Hit Rate**: By cache type
- **Error Rate**: By endpoint
- **Active Users**: Real-time
- **Revenue**: Real-time + historical

### Alerting

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate >5% | Critical | Page on-call |
| Response time p95 >500ms | Warning | Slack notification |
| DB connections >80% | Warning | Auto-scale |
| Disk space >90% | Critical | Immediate action |
```

### 3.2 Plugin Development Guide

**File**: `docs/development/plugins.md`

```markdown
# Plugin Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- TypeScript knowledge
- Understanding of Next.js App Router
- Familiarity with SQLite/PostgreSQL

### Project Setup

1. **Clone and Install**:
```bash
git clone https://github.com/Michaelhehelmy/campops-marketplace.git
cd campops-marketplace
npm install
```

2. **Create Plugin Directory**:
```bash
mkdir -p plugins/your-plugin-name/src
```

3. **Create Plugin Structure**:
```
plugins/your-plugin-name/
├── plugin.json           # Plugin manifest
├── src/
│   ├── index.ts        # Plugin entry point
│   ├── routes.ts       # API routes
│   ├── ui.tsx          # React components
│   └── hooks.ts        # Hook handlers
├── migrations/
│   └── 001_initial.sql # Database migrations
└── __tests__/
    └── index.test.ts   # Tests
```

## Plugin Manifest

**plugin.json**:
```json
{
  "id": "your-plugin-name",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "What your plugin does",
  "author": "Your Name",
  "license": "MIT",
  "requires": {
    "core": ">=1.0.0"
  },
  "provides": {
    "features": ["feature-1", "feature-2"]
  },
  "entry": "src/index.ts",
  "ui": {
    "slots": {
      "dashboard.widget": "DashboardWidget",
      "settings.page": "SettingsPage"
    }
  },
  "hooks": {
    "consumes": ["booking.created", "payment.success"],
    "emits": ["yourplugin.event"]
  },
  "permissions": [
    "plugin.your-plugin.read",
    "plugin.your-plugin.write"
  ]
}
```

## Plugin Entry Point

**src/index.ts**:
```typescript
import type { PluginAPI, PluginContext } from '@sinaicamps/plugin-sdk';
import { createRoutes } from './routes';
import { registerHooks } from './hooks';
import { DashboardWidget, SettingsPage } from './ui';

export async function init(api: PluginAPI, context: PluginContext) {
  console.log(`Initializing ${context.pluginId} v${context.version}`);
  
  // 1. Create database tables
  await setupDatabase(api);
  
  // 2. Register API routes
  const routes = createRoutes(api);
  api.registerRoute('/api/p/your-plugin', routes);
  
  // 3. Register UI components
  api.ui.addSlotComponent('dashboard.widget', DashboardWidget);
  api.ui.addSlotComponent('settings.page', SettingsPage);
  
  // 4. Register hook handlers
  registerHooks(api);
  
  // 5. Seed initial data (if needed)
  if (context.isFirstInstall) {
    await seedData(api);
  }
  
  return {
    status: 'active',
    version: context.version
  };
}

async function setupDatabase(api: PluginAPI) {
  // Create tables
  await api.db.execute(`
    CREATE TABLE IF NOT EXISTS plugin_your_plugin_items (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);
  
  // Create indexes
  await api.db.execute(`
    CREATE INDEX IF NOT EXISTS idx_your_plugin_property 
    ON plugin_your_plugin_items(property_id)
  `);
}

async function seedData(api: PluginAPI) {
  // Add sample data
  await api.db.execute(`
    INSERT INTO plugin_your_plugin_items (id, property_id, name)
    VALUES (?, ?, ?)
  `, ['sample-1', 'default-property', 'Sample Item']);
}
```

## API Routes

**src/routes.ts**:
```typescript
import { z } from 'zod';
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

export function createRoutes(api: PluginAPI) {
  return {
    // GET /api/p/your-plugin/items
    GET: async (req: Request) => {
      try {
        // Verify authentication
        const session = await api.auth.requireAuth();
        
        // Get query params
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        // Fetch data
        const items = await api.db.query(`
          SELECT * FROM plugin_your_plugin_items
          WHERE property_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `, [session.tenantId, limit, offset]);
        
        return Response.json({ items, count: items.length });
      } catch (error) {
        return Response.json(
          { error: 'Failed to fetch items', message: error.message },
          { status: 500 }
        );
      }
    },
    
    // POST /api/p/your-plugin/items
    POST: async (req: Request) => {
      try {
        const session = await api.auth.requireAuth();
        
        // Validate input
        const body = await req.json();
        const validated = createItemSchema.parse(body);
        
        // Create item
        const id = crypto.randomUUID();
        await api.db.execute(`
          INSERT INTO plugin_your_plugin_items (id, property_id, name, description)
          VALUES (?, ?, ?, ?)
        `, [id, session.tenantId, validated.name, validated.description]);
        
        // Emit hook
        await api.hooks.emit('yourplugin.item_created', {
          itemId: id,
          propertyId: session.tenantId,
          name: validated.name
        });
        
        return Response.json({ id, ...validated }, { status: 201 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return Response.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          );
        }
        return Response.json(
          { error: 'Failed to create item' },
          { status: 500 }
        );
      }
    }
  };
}
```

## UI Components

**src/ui.tsx**:
```typescript
import React, { useState, useEffect } from 'react';
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

// Dashboard Widget
export function DashboardWidget({ api }: { api: PluginAPI }) {
  const [stats, setStats] = useState({ total: 0, recent: 0 });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  async function fetchStats() {
    try {
      const res = await fetch('/api/p/your-plugin/stats');
      const data = await res.json();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Your Plugin</h3>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Items</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{stats.recent}</div>
          <div className="text-sm text-gray-500">This Week</div>
        </div>
      </div>
    </div>
  );
}

// Settings Page
export function SettingsPage({ api }: { api: PluginAPI }) {
  const [settings, setSettings] = useState({
    enabled: true,
    notificationEmail: ''
  });
  
  async function saveSettings() {
    await fetch('/api/p/your-plugin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  }
  
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Your Plugin Settings</h2>
      
      <div className="space-y-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
          />
          <span>Enable Plugin</span>
        </label>
        
        <div>
          <label className="block text-sm font-medium">Notification Email</label>
          <input
            type="email"
            value={settings.notificationEmail}
            onChange={(e) => setSettings({...settings, notificationEmail: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300"
          />
        </div>
        
        <button
          onClick={saveSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
```

## Hook System

**src/hooks.ts**:
```typescript
import type { PluginAPI } from '@sinaicamps/plugin-sdk';

export function registerHooks(api: PluginAPI) {
  // React to booking events
  api.hooks.register('booking.created', async (data) => {
    console.log('New booking created:', data.bookingId);
    
    // Your plugin logic here
    await processNewBooking(api, data);
  });
  
  // React to check-in
  api.hooks.register('checkin.completed', async (data) => {
    console.log('Guest checked in:', data.guestName);
    
    // Trigger your plugin action
    await onGuestCheckIn(api, data);
  });
  
  // Emit your own events
  api.hooks.register('yourplugin.custom_event', async (data) => {
    // Other plugins can listen to this
    console.log('Custom event emitted:', data);
  });
}

async function processNewBooking(api: PluginAPI, data: any) {
  // Example: Create a task in your plugin
  await api.db.execute(`
    INSERT INTO plugin_your_plugin_booking_tasks 
    (id, booking_id, status, created_at)
    VALUES (?, ?, 'pending', ?)
  `, [crypto.randomUUID(), data.bookingId, Date.now()]);
}

async function onGuestCheckIn(api: PluginAPI, data: any) {
  // Example: Send welcome notification
  // Implementation here
}
```

## Testing

**__tests__/index.test.ts**:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { init } from '../src/index';
import { createMockAPI } from '@sinaicamps/test-utils';

describe('Your Plugin', () => {
  let api: ReturnType<typeof createMockAPI>;
  
  beforeAll(async () => {
    api = createMockAPI();
    await init(api, { 
      pluginId: 'your-plugin', 
      version: '1.0.0',
      isFirstInstall: true 
    });
  });
  
  afterAll(async () => {
    await api.db.close();
  });
  
  it('should create database tables', async () => {
    const tables = await api.db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE 'plugin_your_plugin_%'
    `);
    expect(tables.length).toBeGreaterThan(0);
  });
  
  it('should handle GET request', async () => {
    const routes = api.getRegisteredRoutes();
    const getHandler = routes['/api/p/your-plugin'].GET;
    
    const req = new Request('http://localhost/api/p/your-plugin');
    const res = await getHandler(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('items');
  });
  
  it('should validate POST data', async () => {
    const routes = api.getRegisteredRoutes();
    const postHandler = routes['/api/p/your-plugin'].POST;
    
    const req = new Request('http://localhost/api/p/your-plugin', {
      method: 'POST',
      body: JSON.stringify({ name: '' }) // Invalid
    });
    
    const res = await postHandler(req);
    expect(res.status).toBe(400);
  });
});
```

## Best Practices

### 1. Security
- Always validate user input with Zod
- Use parameterized queries (never string interpolation)
- Check permissions before actions
- Sanitize all user-provided data

### 2. Performance
- Add indexes for frequently queried columns
- Use pagination for large datasets
- Implement caching where appropriate
- Avoid N+1 queries

### 3. Error Handling
- Always return proper HTTP status codes
- Include helpful error messages
- Log errors for debugging
- Never expose internal errors to users

### 4. Database
- Use plugin-specific table prefixes
- Include created_at and updated_at timestamps
- Create proper indexes
- Write rollback migrations

### 5. Hooks
- Keep hook handlers fast (< 100ms)
- Handle errors gracefully
- Don't block the main flow
- Document emitted/consumed hooks

## Publishing Your Plugin

### 1. Prepare for Release
```bash
# Run tests
npm test

# Check types
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

### 2. Create Release
```bash
# Version bump
npm version patch|minor|major

# Create git tag
git tag v1.0.0
git push origin v1.0.0

# Create GitHub release with notes
```

### 3. Submit to Marketplace
- Package as ZIP
- Include README and CHANGELOG
- Submit via Master Admin → Plugin Marketplace → Submit Plugin

## Resources

- [Plugin SDK Reference](sdk-reference.md)
- [Example Plugins](../../plugins/)
- [Testing Guide](testing.md)
- [Community Discord](https://discord.gg/sinaicamps)
```

---

## Phase 4: Interactive Documentation Site (Priority: MEDIUM)

**Agents**: @frontend_marketplace + @tech_writer

### 4.1 Documentation Site Structure

**Create Next.js App** (`src/app/docs/`):

```typescript
// src/app/docs/layout.tsx
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-layout">
      <DocsSidebar />
      <main className="docs-content">
        {children}
      </main>
      <DocsTOC />
    </div>
  );
}
```

### 4.2 Searchable Documentation

**Implement Search** (`src/components/docs/Search.tsx`):

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';

interface SearchResult {
  title: string;
  path: string;
  excerpt: string;
}

export function DocSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    if (query.length > 2) {
      searchDocs(query);
    }
  }, [query]);
  
  async function searchDocs(q: string) {
    // Use Lunr.js or similar for client-side search
    const res = await fetch(`/api/docs/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.results);
  }
  
  return (
    <div className="relative">
      <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
        <SearchIcon className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="ml-2 bg-transparent outline-none w-64"
        />
      </div>
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto">
          {results.map((result) => (
            <a
              key={result.path}
              href={result.path}
              className="block p-3 hover:bg-gray-50 border-b last:border-0"
              onClick={() => setIsOpen(false)}
            >
              <div className="font-medium">{result.title}</div>
              <div className="text-sm text-gray-500">{result.excerpt}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.3 API Playground

**Interactive API Tester** (`src/components/docs/ApiPlayground.tsx`):

```typescript
'use client';

import { useState } from 'react';

export function ApiPlayground({ endpoint }: { endpoint: any }) {
  const [method, setMethod] = useState(endpoint.methods[0]);
  const [body, setBody] = useState(JSON.stringify(endpoint.exampleRequest, null, 2));
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function sendRequest() {
    setLoading(true);
    try {
      const res = await fetch(endpoint.path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: method !== 'GET' ? body : undefined
      });
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="border rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          {endpoint.methods.map((m: string) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
          {endpoint.path}
        </code>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Request Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-48 p-2 border rounded font-mono text-sm mt-1"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Response</label>
            <button
              onClick={sendRequest}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
          <pre className="w-full h-48 p-2 border rounded font-mono text-sm mt-1 bg-gray-50 overflow-auto">
            {response || 'Click "Send Request" to see response'}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 Code Examples

**Multi-Language Code Blocks** (`src/components/docs/CodeBlock.tsx`):

```typescript
'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const LANGUAGES = ['curl', 'javascript', 'python', 'php', 'go'];

export function CodeExample({ examples }: { examples: Record<string, string> }) {
  const [activeLang, setActiveLang] = useState('curl');
  
  return (
    <div className="rounded-lg overflow-hidden border">
      <div className="flex bg-gray-800">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-4 py-2 text-sm capitalize ${
              activeLang === lang
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
      
      <SyntaxHighlighter
        language={activeLang === 'curl' ? 'bash' : activeLang}
        style={vscDarkPlus}
        customStyle={{ margin: 0 }}
      >
        {examples[activeLang] || examples.curl}
      </SyntaxHighlighter>
    </div>
  );
}
```

---

## Phase 5: Deployment Documentation (Priority: MEDIUM)

**Agents**: @devops + @tech_writer

### 5.1 Installation Guide

**File**: `docs/deployment/installation.md`

```markdown
# Installation Guide

## System Requirements

### Minimum Requirements
- **OS**: Ubuntu 22.04 LTS or CentOS 8
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Node.js**: 18.x or 20.x
- **Database**: PostgreSQL 14+ (production), SQLite 3 (development)

### Recommended for Production
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Database**: PostgreSQL 15 with connection pooling
- **Cache**: Redis 7+
- **CDN**: Cloudflare or AWS CloudFront

## Installation Methods

### Method 1: Docker (Recommended)

**Prerequisites**:
- Docker 24+
- Docker Compose 2+

**Steps**:

1. **Clone Repository**:
```bash
git clone https://github.com/Michaelhehelmy/campops-marketplace.git
cd campops-marketplace
```

2. **Environment Configuration**:
```bash
cp .env.example .env
nano .env  # Edit configuration
```

Required variables:
```bash
# Database
DATABASE_URL=postgresql://user:pass@db:5432/sinaicamps

# Authentication
AUTH_SECRET=$(openssl rand -base64 32)

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

3. **Start Services**:
```bash
docker-compose up -d
```

4. **Run Migrations**:
```bash
docker-compose exec app npm run db:migrate
```

5. **Create Admin User**:
```bash
docker-compose exec app npm run create-admin
```

6. **Verify**:
```bash
curl http://localhost:3000/api/health
# Should return: { "status": "ok" }
```

### Method 2: Manual Installation

**Step 1: System Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
sudo apt-get install -y nginx

# Install PM2
sudo npm install -g pm2
```

**Step 2: Database Setup**
```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE sinaicamps;"
sudo -u postgres psql -c "CREATE USER sinai WITH ENCRYPTED PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sinaicamps TO sinai;"
```

**Step 3: Application Setup**
```bash
# Create app directory
sudo mkdir -p /var/www/sinaicamps
sudo chown $USER:$USER /var/www/sinaicamps

# Clone and install
cd /var/www/sinaicamps
git clone https://github.com/Michaelhehelmy/campops-marketplace.git .
npm install

# Build
npm run build

# Environment
cp .env.example .env
nano .env  # Configure
```

**Step 4: PM2 Configuration**
```bash
# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'sinaicamps',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/sinaicamps',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/sinaicamps/err.log',
    out_file: '/var/log/sinaicamps/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Step 5: Nginx Configuration**
```bash
# Copy config
sudo cp nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo ln -s /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Step 6: SSL Certificate**
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Post-Installation

### Initial Setup

1. **Access Admin Panel**:
   - Visit `https://yourdomain.com/admin`
   - Log in with admin credentials

2. **Configure Marketplace Settings**:
   - Platform name and branding
   - Email/SMS providers
   - Payment gateways
   - Default tenant settings

3. **Install Core Plugins**:
   - Booking
   - Housekeeping
   - POS (if needed)
   - Analytics

4. **Create First Tenant**:
   - Use as test/demo property
   - Verify all features work
   - Configure OTA integrations

### Health Checks

**Verify Installation**:
```bash
# API health
curl https://yourdomain.com/api/health

# Database connection
curl https://yourdomain.com/api/health/db

# Cache status
curl https://yourdomain.com/api/health/cache

# View logs
pm2 logs sinaicamps
```

## Troubleshooting

### Common Issues

**Database connection failed**:
- Check DATABASE_URL format
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check firewall rules

**Build errors**:
- Ensure Node.js version 18+
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

**Nginx 502 error**:
- Check PM2 status: `pm2 status`
- Verify app is running on port 3000
- Check firewall: `sudo ufw status`

**SSL certificate issues**:
- Check certificate: `sudo certbot certificates`
- Renew manually: `sudo certbot renew`
- Verify nginx config includes SSL

## Next Steps

- [Configuration Guide](configuration.md)
- [Monitoring Setup](monitoring.md)
- [Backup & Recovery](backup.md)
- [Scaling Guide](scaling.md)
```

### 5.2 Configuration Reference

**File**: `docs/deployment/configuration.md`

Complete reference of all environment variables, settings, and configuration options.

---

## Verification Checklist

### Documentation Completeness:
- [ ] OpenAPI spec generated and valid
- [ ] All API endpoints documented with examples
- [ ] 4 user guides complete (Master/Manager/Staff/Guest)
- [ ] Plugin development guide complete
- [ ] Architecture documentation complete
- [ ] Installation guide tested
- [ ] Interactive docs site deployed
- [ ] Search functionality working
- [ ] API playground functional
- [ ] Code examples in 5+ languages

### Quality Checks:
- [ ] No broken links
- [ ] All images load correctly
- [ ] Code examples are runnable
- [ ] API responses match actual API
- [ ] User guides tested with real users
- [ ] Documentation is searchable
- [ ] Mobile-friendly layout
- [ ] Dark mode support

---

## Execution Order (Two-Tier Documentation)

**WEEK 1 — Core Platform Documentation**
- Day 1-2: Core API OpenAPI spec (platform routes only)
- Day 3-4: Core manual API docs (auth, tenants, properties)
- Day 5: Core API verification

**WEEK 2 — User Guides**
- Day 1: Master Admin guide
- Day 2: Property Manager guide
- Day 3: Staff guide
- Day 4: Guest guide
- Day 5: Review and polish

**WEEK 3 — Plugin Documentation Hub**
- Day 1-2: Critical plugins (booking, housekeeping, maintenance, pos-kds)
- Day 3: Operations plugins (inventory, staff, loyalty, crm)
- Day 4: Integration plugins (OTA, iCal, marketing)
- Day 5: Plugin docs verification + index creation

**WEEK 4 — Developer Docs + Interactive Site + Deployment**
- Day 1: Architecture documentation
- Day 2: Plugin development guide
- Day 3: Interactive docs site (search, API playground)
- Day 4: Deployment documentation
- Day 5: Final review, testing, and launch

---

## Success Metrics (Two-Tier System)

### Core Platform Documentation
| Metric | Target | Status |
|--------|--------|--------|
| Core API endpoints documented | 100% | ⬜ |
| Core OpenAPI spec valid | Yes | ⬜ |
| User guides complete | 4/4 | ⬜ |
| Architecture docs | Complete | ⬜ |
| Deployment docs | Complete | ⬜ |

### Plugin Documentation Hub
| Metric | Target | Status |
|--------|--------|--------|
| Plugins documented | 24/24 | ⬜ |
| Plugin API docs | All plugins | ⬜ |
| Plugin configuration docs | All plugins | ⬜ |
| Plugin user guides | Complex plugins | ⬜ |
| Plugin index/searchable | Yes | ⬜ |

### Overall Quality
| Metric | Target | Status |
|--------|--------|--------|
| Code examples | 100+ | ⬜ |
| Interactive features | 3+ | ⬜ |
| Documentation site live | Yes | ⬜ |
| User testing feedback | >4.5/5 | ⬜ |

---

## Agent Assignments (Two-Tier System)

### Core Platform Docs
- **@backend_architect** → Core OpenAPI spec, core API docs, architecture
- **@tech_writer** → User guides (all 4), developer onboarding docs
- **@frontend_marketplace** → Interactive docs site, search, API playground
- **@ux_designer** → User guide structure, navigation design
- **@devops** → Deployment documentation

### Plugin Documentation Hub
- **@plugin_booking** → Booking plugin docs
- **@plugin_operations** → Housekeeping, maintenance, POS, inventory, staff, financial-ops, accounting, hr-core, activities, subscriptions
- **@plugin_crm** → Loyalty, CRM, guest-crm, marketing-automation
- **@plugin_integrations** → OTA, iCal, ical-import, integrations, siteminder
- **@plugin_payments** → Paymob plugin docs
- **@frontend_marketplace** → PWA plugin docs
- **@backend_architect** → Resource, listing-admin, owner plugins
- **@tech_writer** → Plugin docs review and consistency

**Execute all phases. Deliver complete two-tier documentation suite.**
