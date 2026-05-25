# OpenCode Multi-Agent Prompt: Tenant Architecture & PWA Overhaul

## Executive Summary

**Critical Issue**: Current tenant routing forces `/en/stay/acacia` as homepage instead of a proper tenant website with homepage/services/about/gallery. Guest auth is incorrectly configured. PWA strategy needs complete redesign.

**User Requirements**:
1. **Tenant Sites**: Normal multi-page websites (home, services, about, gallery) NOT single listing pages
2. **Guest Access**: NO login required for guests browsing tenants - guests access marketplace-wide guest portal
3. **Role Clarity**: Master, Manager-Tenant, Staff-Tenant, Guest with clear separation
4. **Ultimate Plan**: Custom domain tenants where manager/staff can auth from main OR tenant domain
5. **PWA Strategy**: Different PWA scopes for main marketplace vs tenant domains

---

## Current State Analysis

### PROBLEMS IDENTIFIED

**1. Tenant Routing Crisis** (`src/middleware.ts:249-266`)
```typescript
// CURRENT (WRONG): Always rewrites tenant root to /stay/slug
if (isTenantRoot) {
  rewriteUrl.pathname = `/${locale}/stay/${tenantSlug}`;  // ← THIS IS THE PROBLEM
  // Results in: acaciacamp.com → acaciacamp.com/en/stay/acacia
}
```

**2. Guest Auth Confusion** (`src/middleware.ts:38`)
```typescript
const AUTH_REQUIRED = ['/owner', '/admin', '/guest', '/manage', ...];
// '/guest' should NOT be here - guests don't need auth to browse!
```

**3. No Tenant Homepage System**
- No tenant-specific homepage template
- No tenant content management (CMS pages)
- No tenant navigation structure

**4. PWA Misconfiguration**
- Single manifest for all contexts
- No differentiation between marketplace vs tenant PWA
- No role-based PWA access control

---

## REQUIRED ARCHITECTURE CHANGES

### Phase 1: Tenant Website Routing (Priority: CRITICAL)

**Agents**: @frontend_marketplace, @backend_architect, @middleware_agent

#### 1.1 Create Tenant Homepage System

**New Route Structure**:
```
Tenant Website (e.g., acaciacamp.com):
├── /                    → Tenant homepage (NEW)
├── /about              → About page (NEW)
├── /services           → Services page (NEW)
├── /gallery            → Gallery page (NEW)
├── /contact            → Contact page (NEW)
├── /rooms              → Room listings (NEW)
├── /book               → Booking page (was /stay/acacia)
└── /book/[roomId]      → Specific room booking
```

**Implementation**:

**A. Create Tenant Layout** (`src/app/[locale]/[tenant]/layout.tsx`):
```typescript
// Tenant-specific layout with tenant nav, branding, footer
export default async function TenantLayout({ 
  children, 
  params: { locale, tenantSlug } 
}) {
  const tenant = await getTenantBySlug(tenantSlug);
  
  return (
    <TenantProvider tenant={tenant}>
      <TenantNav tenant={tenant} pages={tenant.pages} /> {/* Home, About, Services, Gallery */}
      <main>{children}</main>
      <TenantFooter tenant={tenant} />
    </TenantProvider>
  );
}
```

**B. Create Tenant Page Router** (`src/app/[locale]/[tenant]/page.tsx`):
```typescript
// Dynamic tenant homepage based on tenant config
export default async function TenantHomepage({ 
  params: { locale, tenantSlug } 
}) {
  const tenant = await getTenantBySlug(tenantSlug);
  const homepageConfig = tenant.settings?.homepage || {};
  
  return (
    <>
      <TenantHero tenant={tenant} />
      <TenantServices services={homepageConfig.services} />
      <TenantGallery images={homepageConfig.gallery} />
      <TenantAbout content={homepageConfig.about} />
      <FeaturedRooms rooms={tenant.rooms} />
      <CallToAction />
    </>
  );
}
```

**C. Update Middleware** (`src/middleware.ts`):
```typescript
// NEW: Check if tenant has custom pages configured
const tenantHasWebsite = tenantPlan !== 'basic'; // ultimate/premium have full websites

if (tenantPropertyId && tenantSlug) {
  if (isTenantRoot) {
    if (tenantHasWebsite) {
      // NEW: Serve tenant homepage, NOT redirect to /stay
      rewriteUrl.pathname = `/${locale}/${tenantSlug}`;
      logger.info(`[Middleware] Serving tenant homepage: ${rewriteUrl}`);
    } else {
      // Basic plan: redirect to listing page on main marketplace
      const marketplaceUrl = `${scheme}://${BASE_DOMAIN}/${locale}/stay/${tenantSlug}`;
      return NextResponse.redirect(marketplaceUrl, 302);
    }
  }
}
```

**D. Create Tenant Navigation** (`src/components/tenant/TenantNav.tsx`):
```typescript
interface TenantNavProps {
  tenant: TenantInfo;
  pages: Array<{ slug: string; title: string; href: string }>;
}

export function TenantNav({ tenant, pages }: TenantNavProps) {
  const defaultPages = [
    { slug: 'home', title: 'Home', href: '/' },
    { slug: 'about', title: 'About', href: '/about' },
    { slug: 'services', title: 'Services', href: '/services' },
    { slug: 'gallery', title: 'Gallery', href: '/gallery' },
    { slug: 'rooms', title: 'Rooms', href: '/rooms' },
    { slug: 'contact', title: 'Contact', href: '/contact' },
  ];
  
  const navPages = pages?.length > 0 ? pages : defaultPages;
  
  return (
    <nav className="tenant-nav" style={{ '--tenant-primary': tenant.branding.colors.primary }}>
      <TenantLogo tenant={tenant} />
      <ul>
        {navPages.map(page => (
          <li key={page.slug}>
            <Link href={page.href}>{page.title}</Link>
          </li>
        ))}
      </ul>
      <BookNowButton tenant={tenant} />
    </nav>
  );
}
```

#### 1.2 Database Schema Updates

**Add Tenant CMS Pages** (`src/db/schema.ts` or migrations):
```sql
-- New table for tenant website pages
CREATE TABLE tenant_pages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES properties(id),
  UNIQUE(tenant_id, slug)
);

-- Add tenant website config to properties table
ALTER TABLE properties ADD COLUMN website_config TEXT; -- JSON: {homepage: {...}, theme: "...", pages: [...]}
```

**Agent**: @db_architect

---

### Phase 2: Guest Access Restructure (Priority: CRITICAL)

**Agents**: @auth_agent, @security, @frontend_marketplace

#### 2.1 Remove Guest from Auth Requirements

**Fix** (`src/middleware.ts:38`):
```typescript
// BEFORE (WRONG):
const AUTH_REQUIRED = ['/owner', '/admin', '/guest', '/manage', ...];

// AFTER (CORRECT):
const AUTH_REQUIRED = ['/owner', '/admin', '/manage', '/master', '/staff'];
// Note: '/guest' REMOVED - guests don't need auth to browse!
```

#### 2.2 Create Guest Portal System

**New Guest-Only Routes** (public, no auth required):
```
Main Marketplace (sinaicamps.com):
├── /guest/portal           → Guest portal dashboard (NEW)
├── /guest/bookings         → My bookings (requires auth OR email lookup)
├── /guest/profile          → Guest profile
├── /guest/support          → Support tickets
└── /guest/loyalty          → Loyalty points
```

**Implementation**:

**A. Guest Portal Page** (`src/app/[locale]/guest/portal/page.tsx`):
```typescript
// Guest portal - accessible without auth
// Shows: Search, Featured Properties, My Bookings (via email lookup)
export default function GuestPortalPage() {
  return (
    <GuestPortalLayout>
      <PropertySearch />
      <FeaturedProperties />
      <MyBookingsLookup /> {/* Lookup by email, no login required */}
      <GuestServices />
    </GuestPortalLayout>
  );
}
```

**B. Guest Booking Lookup** (`src/app/api/guest/bookings/route.ts`):
```typescript
// Allow guests to look up bookings by email + booking reference
// NO authentication required - just verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const reference = searchParams.get('reference');
  
  if (!email || !reference) {
    return Response.json({ error: 'Email and reference required' }, { status: 400 });
  }
  
  // Verify booking exists for this email + reference
  const booking = await verifyBookingByEmailAndReference(email, reference);
  
  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 });
  }
  
  return Response.json({ booking: sanitizeBooking(booking) });
}
```

**C. Guest Middleware Update** (`src/middleware.ts`):
```typescript
// Guest-specific logic
const isGuestRoute = pathname.startsWith('/guest');

if (isGuestRoute) {
  // Guest routes are PUBLIC - no auth required
  // But if user IS logged in, show personalized content
  const session = await getOptionalSession(req);
  
  if (session) {
    // User is logged in - enrich with their data
    req.headers.set('x-guest-user-id', session.user.id);
  }
  
  // Continue to guest route
  return NextResponse.next();
}
```

#### 2.3 Tenant Guest Experience

**Tenant sites should**:
- Allow browsing without ANY authentication
- Show "Book Now" buttons that go to booking flow
- Allow booking as guest (collect email at checkout) OR login if they want
- After booking, send confirmation email with booking reference
- Guest can look up booking via `/guest/bookings?email=X&reference=Y`

**Agent**: @frontend_marketplace + @plugin_booking

---

### Phase 3: User Role Architecture (Priority: HIGH)

**Agents**: @auth_agent, @backend_architect, @security

#### 3.1 Clarify Role Hierarchy

```
ROLE HIERARCHY:
├── master              → Platform admin (sinaicamps.com/admin/*)
├── manager             → Property/tenant owner (can be on main OR tenant domain)
│   └── On main: /owner/*
│   └── On tenant: /manage/[tenant]/*
├── staff               → Tenant staff (belongs to specific tenant)
│   └── On main: Cannot access (redirect to their tenant)
│   └── On tenant: /manage/[tenant]/* (limited permissions)
└── guest               → Public user (no auth required)
    └── Marketplace-wide: /guest/*, /search, /book/*
    └── Tenant sites: Browse freely, book as guest
```

#### 3.2 Ultimate Plan Cross-Domain Auth

**Requirement**: Manager/staff with ultimate plan can sign in from:
- Main marketplace (sinaicamps.com) → Redirected to their tenant dashboard
- Their own domain (acaciacamp.com) → Direct access to tenant dashboard

**Implementation** (`src/middleware.ts`):
```typescript
// Ultimate tenant cross-domain auth
if (needsAuth && token) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userRole = session?.user?.role;
  const userTenantId = session?.user?.tenantId; // Need to add this to session
  
  // Manager/Staff trying to access from main marketplace
  if (isMainDomain && ['manager', 'staff'].includes(userRole)) {
    // Redirect to their tenant domain
    const tenant = await getTenantById(userTenantId);
    if (tenant?.customDomain) {
      const redirectUrl = `https://${tenant.customDomain}${pathname}`;
      return NextResponse.redirect(redirectUrl, 302);
    }
  }
  
  // Manager/Staff accessing their own tenant domain - allow
  if (isTenantDomain && userTenantId === tenantPropertyId) {
    return NextResponse.next(); // Allow
  }
  
  // Staff trying to access different tenant - deny
  if (isTenantDomain && userTenantId !== tenantPropertyId) {
    return NextResponse.redirect(`/${locale}/unauthorized`, 403);
  }
}
```

#### 3.3 Staff Permission System

**Staff restrictions** (already partially implemented, verify complete):
```typescript
const STAFF_RESTRICTED = ['/finance', '/settings', '/plugins', '/admin'];

if (userRole === 'staff' && STAFF_RESTRICTED.some(p => pathname.includes(p))) {
  return NextResponse.redirect(`/${locale}/unauthorized`, 403);
}
```

**Agent**: @auth_agent + @security

---

### Phase 4: PWA Strategy Redesign (Priority: HIGH)

**Agents**: @frontend_marketplace, @backend_architect, @theme_designer

#### 4.1 Dual PWA Architecture

**A. Main Marketplace PWA** (sinaicamps.com)
- **Scope**: Main domain only
- **Users**: Master, Manager (when on main), Guest Portal
- **Features**: 
  - Search all properties
  - Guest booking flow
  - Master admin dashboard
  - Manager dashboard (redirects to tenant domain)

**B. Tenant PWA** (acaciacamp.com - ultimate only)
- **Scope**: Tenant domain only
- **Users**: Manager, Staff (NO guests, NO public)
- **Features**:
  - Tenant dashboard
  - Staff management
  - Property settings
  - Bookings management
  - Analytics

#### 4.2 Dynamic Manifest Generation

**A. Main Marketplace Manifest** (`src/app/api/manifest.webmanifest/route.ts`):
```typescript
export async function GET(req: Request) {
  const host = req.headers.get('host');
  const isTenant = await isTenantDomain(host);
  
  if (isTenant) {
    // Return tenant-specific manifest (manager/staff PWA)
    const tenant = await getTenantByHost(host);
    return Response.json({
      name: `${tenant.name} - Management`,
      short_name: `${tenant.name} Admin`,
      start_url: '/manage/dashboard',
      display: 'standalone',
      scope: `https://${host}/`,
      // Only show install prompt to authenticated manager/staff
    });
  }
  
  // Return marketplace manifest (public PWA)
  return Response.json({
    name: 'SinaiCamps Marketplace',
    short_name: 'SinaiCamps',
    start_url: '/',
    display: 'standalone',
    scope: 'https://sinaicamps.com/',
  });
}
```

**B. Role-Based Install Prompt** (`src/components/PWAInstallPrompt.tsx`):
```typescript
export function PWAInstallPrompt() {
  const { user, tenant } = useAuth();
  const isTenantDomain = useIsTenantDomain();
  
  // On tenant domain: only show to manager/staff
  if (isTenantDomain && !['manager', 'staff'].includes(user?.role)) {
    return null; // Don't show install to guests on tenant domain
  }
  
  // On main domain: show to everyone
  return <InstallButton />;
}
```

#### 4.3 Service Worker Scope Isolation

**Main Marketplace SW** (`public/sw-marketplace.js`):
```javascript
// Only intercept requests to main domain
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname !== 'sinaicamps.com') {
    return; // Don't handle tenant domain requests
  }
  // ... cache strategies
});
```

**Tenant SW** (`public/sw-tenant.js`, served via API route for each tenant):
```javascript
// Tenant-specific service worker
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.hostname.includes(tenantDomain)) {
    return; // Only handle this tenant's requests
  }
  // ... tenant-specific cache
});
```

**Agent**: @frontend_marketplace

---

### Phase 5: Tenant CMS System (Priority: MEDIUM)

**Agents**: @db_architect, @backend_architect, @frontend_dashboards

#### 5.1 Tenant Content Management

**Tenant Admin Dashboard** (`src/app/[locale]/manage/[tenant]/website/page.tsx`):
```typescript
// Allow tenant managers to customize their website
export default function TenantWebsiteEditor() {
  return (
    <WebsiteEditor>
      <PageBuilder />
      <NavigationEditor />
      <ThemeCustomizer />
      <SESettings />
    </WebsiteEditor>
  );
}
```

**Database**: Use `tenant_pages` table created in Phase 1

---

## Verification Checklist

### After Each Phase, Verify:

**Phase 1**:
- [ ] Tenant homepage loads at `acaciacamp.com/` (not `/en/stay/acacia`)
- [ ] Tenant has navigation: Home, About, Services, Gallery, Rooms, Contact
- [ ] Tenant pages are customizable per tenant
- [ ] Basic plan tenants redirect to main marketplace listing
- [ ] Ultimate/Premium tenants have full websites

**Phase 2**:
- [ ] `/guest/*` routes are PUBLIC (no auth required)
- [ ] Guest portal accessible without login
- [ ] Guest can look up bookings by email + reference
- [ ] `/guest` removed from AUTH_REQUIRED

**Phase 3**:
- [ ] Manager can sign in from main marketplace → redirected to tenant domain
- [ ] Manager can sign in directly from tenant domain
- [ ] Staff can only access their assigned tenant
- [ ] Staff cannot access finance/settings/plugins
- [ ] Guest can browse all tenant sites without auth

**Phase 4**:
- [ ] Main marketplace PWA works for guests
- [ ] Tenant PWA only shows install prompt to manager/staff
- [ ] Tenant PWA scope restricted to tenant domain
- [ ] Different manifests for marketplace vs tenant

---

## File Changes Required

| File | Change Type | Agent |
|------|-------------|-------|
| `src/middleware.ts` | Major rewrite | @middleware_agent |
| `src/app/[locale]/[tenant]/` | New directory | @frontend_marketplace |
| `src/app/[locale]/[tenant]/page.tsx` | New | @frontend_marketplace |
| `src/app/[locale]/[tenant]/about/page.tsx` | New | @frontend_marketplace |
| `src/app/[locale]/[tenant]/services/page.tsx` | New | @frontend_marketplace |
| `src/app/[locale]/[tenant]/gallery/page.tsx` | New | @frontend_marketplace |
| `src/app/[locale]/guest/portal/page.tsx` | New | @frontend_marketplace |
| `src/components/tenant/TenantNav.tsx` | New | @frontend_marketplace |
| `src/components/tenant/TenantFooter.tsx` | New | @frontend_marketplace |
| `src/db/migrations/012_tenant_website.sql` | New | @db_architect |
| `src/app/api/manifest.webmanifest/route.ts` | Modify | @frontend_marketplace |
| `src/app/api/guest/bookings/route.ts` | New | @backend_architect |
| `src/lib/auth.ts` | Modify session | @auth_agent |

---

## Success Criteria

**Phase 1 Complete When**:
- Tenant websites have proper homepages (not redirected to /stay)
- Each tenant can have custom: Home, About, Services, Gallery pages
- Navigation works on all tenant pages

**Phase 2 Complete When**:
- `/guest/*` routes accessible without login
- Guest portal functional
- Booking lookup by email+reference works

**Phase 3 Complete When**:
- Manager cross-domain auth works (main → tenant redirect)
- Staff restricted to their tenant only
- Role-based access control fully enforced

**Phase 4 Complete When**:
- Two distinct PWA strategies operational
- Tenant PWA only for manager/staff
- Marketplace PWA for guests

---

## Final Report Template

```markdown
## Tenant Architecture Overhaul — Completion Report

### Changes Made

#### Phase 1: Tenant Website Routing
- [x] Created tenant homepage system
- [x] Updated middleware to serve tenant pages
- [x] Created tenant navigation component
- [x] Added tenant CMS database tables

#### Phase 2: Guest Access
- [x] Removed /guest from AUTH_REQUIRED
- [x] Created guest portal
- [x] Implemented booking lookup by email+reference
- [x] Updated guest middleware logic

#### Phase 3: Role Architecture
- [x] Fixed cross-domain auth for ultimate tenants
- [x] Enforced staff tenant restrictions
- [x] Added manager redirect logic

#### Phase 4: PWA Strategy
- [x] Created dual manifest system
- [x] Implemented role-based install prompts
- [x] Scoped service workers correctly

### Test Results
- Tenant homepage: ✅ Loads correctly
- Guest access: ✅ No auth required
- Cross-domain auth: ✅ Working
- PWA: ✅ Separate strategies operational

### Verdict
🟢 **TENANT ARCHITECTURE COMPLETE** — Ready for production
```

**Execute all phases. Report progress per phase.**
