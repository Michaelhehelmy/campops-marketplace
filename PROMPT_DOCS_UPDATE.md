# OpenCode Agent Prompt: Documentation Sync to Current Implementation

## Mission

Every doc file was written before the codebase reached its current state. Update every stale document to match the implementation as it exists today. Do not invent features. Read the source code first, then write the documentation.

**Golden rule: docs describe reality, not intent.**

**Read before starting:**
- `AGENT_LOGBOOK.md` — all entries, especially Persistent Learnings
- `FRONTEND_AUDIT_REPORT.md` — what was fixed in the UI
- `.env.example` — canonical list of env vars

**Test baseline — must not regress:**
```bash
npm test                                              # 1177 pass
npx playwright test --reporter=list 2>&1 | tail -3   # 376/376
```

---

## Pre-Audit: Find All Stale Claims

Before touching any file, run these checks to identify lies in the docs:

```bash
# 1. Count actual test files and assertions
npm test -- --reporter=verbose 2>&1 | grep "Tests "

# 2. Verify database type in production
grep -n "DATABASE_URL\|PostgreSQL\|SQLite\|sqlite\|pg\b" src/lib/db.ts | head -10

# 3. Check actual hook constant names in SDK
grep -rn "BOOKING_CREATED\|GUEST_CHECKED_OUT\|CORE_SITE\|booking\." packages/plugin-sdk/src/ --include="*.ts" | head -20

# 4. Find actual API routes (for API reference accuracy)
find src/app/api -name "route.ts" | sort | sed 's|src/app/api||;s|/route.ts||' | head -40

# 5. Check auth method
grep -n "signIn\|socialProviders\|googleOAuth\|google" src/lib/auth.ts | head -10

# 6. Check registration wizard step order
ls src/app/\[locale\]/list-your-camp/
```

Use these findings to correct every stale claim below.

---

## File 1: `README.md`

### Known stale sections — fix each:

**1. Production Status line:**
```
# WRONG (current):
🟢 Production Status: [May 2026] All critical audits passed. 1102 tests green.

# CORRECT (update with real numbers):
🟢 Production Status: [May 2026] All audits passed. 1,177 unit tests · 376 E2E tests · 0 failures.
```

**2. Architecture diagram:**
Current README shows:
```
└── tenant.theirdomain.com ──────► Cloudflare Pages (Vite SPA)
```
This is wrong. Read the actual tenant architecture:
```bash
cat src/app/\[locale\]/\[tenantSlug\]/\[\[...slug\]\]/page.tsx | head -30
cat src/components/tenant/TenantHomePage.tsx | head -20
```
The tenant site is **server-rendered by the same Next.js app**, not a separate Vite SPA on Cloudflare Pages. Update the diagram to reflect reality.

**3. Tech stack table:**
Add the items now in production:
- Better Auth (with Google OAuth)
- Paymob (payment gateway — Egypt)
- Prometheus + Grafana (metrics)
- PM2 (cluster mode, process management)
- prom-client (metrics library)

**4. Plugin list:**
Read the actual plugins directory:
```bash
ls plugins/ | sort
```
Update the plugin list to match exactly what's in `plugins/`. Remove plugins not in the directory. Add any that are there but not documented.

**5. Test badge counts:**
Update to: 1177 unit tests, 376 E2E tests.

---

## File 2: `docs/DEPLOYMENT.md`

### Critical error — fix first:

The current `DEPLOYMENT.md` says:
```
- [ ] DATABASE_URL points to PostgreSQL (not SQLite in production)
```

**This is wrong.** Read `src/lib/db.ts` — the app uses **SQLite with WAL mode** in production, not PostgreSQL. Fix every reference to PostgreSQL in this file.

### Full rewrite checklist:

**Section: Pre-deployment checklist** — update to match `.env.example`:
```bash
cat .env.example
```
Add every required env var. Remove `DATABASE_URL` PostgreSQL reference. Add:
- `METRICS_TOKEN` (Prometheus endpoint auth)
- `COOKIE_SIGNING_SECRET` (HMAC role cookie signing)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (OAuth)
- `PAYMOB_API_KEY` / `PAYMOB_INTEGRATION_ID` / `PAYMOB_IFRAME_ID` / `PAYMOB_HMAC_SECRET`
- `GRAFANA_ADMIN_PASSWORD`
- `ALERT_WEBHOOK_URL`

**Section: Infrastructure** — update to reflect actual setup:
```bash
cat ecosystem.config.js     # PM2 cluster config
cat nginx-unified.conf      # Nginx config
```
Document:
- PM2 cluster mode (`exec_mode: cluster`, `instances: max`)
- PM2 graceful reload via `pm2 reload sinaicamps --update-env`
- Nginx `proxy_set_header X-Forwarded-Host $host` (required for Better Auth)
- SQLite WAL mode + pragma tuning (from `src/lib/db.ts`)
- Backup script: `scripts/backup-db.sh` (daily at 2am)
- Health check: `scripts/health-check.sh`

**Section: Health endpoint** — verify and document:
```bash
curl http://localhost:3000/api/health
```
Document that `/api/health` returns:
- **200** with `{"status":"ok"}` or `{"status":"degraded","warnings":[...]}` for normal operation
- **503** only when critical systems fail

**Section: Metrics** — add:
Document that `/api/metrics` requires `Authorization: Bearer $METRICS_TOKEN` and returns Prometheus text format.

**Section: SSL / Cloudflare** — verify current approach:
```bash
grep -n "ssl\|SSL\|certbot\|cloudflare\|tls" nginx-unified.conf | head -10
```

**Delete the stale `docs/deployment.md`** (lowercase) if it still exists:
```bash
ls docs/deployment.md 2>/dev/null && git rm docs/deployment.md
```

---

## File 3: `docs/getting-started.md`

Read the current file fully, then update:

**1. Clone URL** — update to actual GitHub repo:
```
https://github.com/Michaelhehelmy/campops-marketplace.git
```

**2. Env setup** — current instructions may reference a stale `.env.example`. Re-verify:
```bash
cat .env.example | head -40
```
Update the "minimum dev env vars" section to match what's actually needed for `npm run dev` to work.

**3. Database setup** — verify the actual init command:
```bash
grep -n "db:migrate\|db:seed\|db:push\|db:init" package.json
```
Document the exact commands to initialize the database for local dev.

**4. Test run section** — update counts:
```
# Unit tests (1177)
npm test

# E2E tests (376) — requires dev server running
npx playwright test

# Auth-gaps only (fast, 53 tests)
npx playwright test e2e/tests/core/auth-gaps.spec.ts
```

**5. Seeded test users** — verify these exist in `e2e/global-setup.ts` or seed file:
```bash
grep -rn "master@\|guest@\|safari@\|manager@" e2e/ --include="*.ts" | head -10
```
Document the actual seeded credentials.

---

## File 4: `docs/development/testing.md`

Read the current file, then update every section:

**1. Test counts:**
```markdown
## Baseline
- Unit/integration: **1,177 tests** across 131 files (Vitest)
- E2E: **376 tests** across 45+ spec files (Playwright)
```

**2. E2E test structure:**
```bash
find e2e/tests -name "*.spec.ts" | sort
```
Document the actual test directories:
- `e2e/tests/core/` — auth, auth-gaps, tenant-isolation, tier-restrictions, infrastructure, public-apis, auth-escalation, booking-operations
- `e2e/tests/flows/` — guest-self-service, manager-crud, owner-property-crud, payment-failures, plan-upgrade-ui, search-filters
- `e2e/tests/responsive/` — mobile.spec.ts (Pixel 5), locale.spec.ts (en/ar + RTL)

**3. Auth fixture pattern** — document how E2E auth works:
```bash
cat e2e/helpers/auth.fixture.ts | head -50
```
Document: role-based cookie injection, why API login is used instead of UI login.

**4. CSRF pattern** — document the canonical helpers:
```bash
cat e2e/helpers/page-helpers.ts
```
Document `loginAs()`, `extractCsrf()`, `signInForRequest()`, `futureDates()`.

**5. Playwright config** — document projects:
```bash
cat playwright.config.ts
```
Document: `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 5) projects; health check URL; global setup.

**6. Known gotchas** (from `AGENT_LOGBOOK.md`) — copy the E2E-specific gotchas:
- Browser UI login unreliable — always use POST `/api/auth/sign-in/email`
- CSRF extraction from `set-cookie` response header
- `booking-fallback` widget always visible — only assert `booking-real`
- Plugin toggle via API, not UI

---

## File 5: `docs/plugins/hook-catalog.md`

Read the current catalog, then verify every hook name against the actual SDK:
```bash
cat packages/plugin-sdk/src/types.ts | grep -A2 "Hooks\|const Hook\|BOOKING\|CHECKOUT\|PLAN\|SITE"
```

**Fix any mismatches.** Confirmed accurate hook names from the codebase:

| Doc name | Real constant | Action |
|----------|--------------|--------|
| `booking.created` | Verify: `Hooks.BOOKING_CREATED` | Update if wrong |
| `guest.checked_out` | Verify: `Hooks.GUEST_CHECKED_OUT` | Update if wrong |
| `site.plan_upgraded` | Verify: `Hooks.CORE_SITE_PLAN_UPGRADED` | Update if wrong |

For each hook in the catalog, add:
- The exact string emitted (not just the constant name)
- Which plugin fires it
- Which plugins subscribe to it
- A working code example using the SDK import

---

## File 6: `docs/plugin-development-guide.md`

Read fully. Update these confirmed-stale sections:

**1. Auth in plugin routes:**
The guide may say "call `api.auth.getSession()`". Verify the correct pattern:
```bash
grep -rn "getSession\|requireRole" plugins/booking/src/ --include="*.ts" | head -10
grep -rn "requireRole\|getSession" src/lib/ --include="*.ts" | head -10
```
Document the correct pattern for protecting plugin routes, including the `requireRole` function if it's now the standard.

**2. Plugin manifest (`plugin.json`):**
Verify the required fields:
```bash
cat plugins/booking/plugin.json
cat plugins/owner/plugin.json
```
Show the complete, correct schema with all required fields (`id`, `name`, `version`, `campopsVersion`, `capabilities`, `hooks`, `reviewStatus`).

**3. Logger in plugins:**
From AGENT_LOGBOOK: plugin code uses `api.logger.info()` / `api.logger.error()` — not `console.log()` and not the server-side `logger` import. Document this clearly.

**4. Node16 moduleResolution — `.js` extensions:**
From AGENT_LOGBOOK: *"@sinaicamps/plugin-sdk uses moduleResolution: node16 — all relative imports need .js extensions"*. Add a "Common Gotchas" section:
```typescript
// ❌ Wrong — will fail with node16 moduleResolution:
import { BookingService } from '../services/BookingService';

// ✅ Correct:
import { BookingService } from '../services/BookingService.js';
```

**5. Transaction serialization warning:**
Add to the "Database" section:
```markdown
> ⚠️ **SQLite transaction safety**: The platform serializes all SQLite transactions via a
> promise-chain queue in `DrizzleDatabaseWrapper`. Never call `db.transaction()` concurrently
> from a plugin — it is safe to call it sequentially. This prevents SQLITE_BUSY race conditions
> in Next.js concurrent request handling.
```

---

## File 7: `docs/user-guides/property-owner.md`

Read the current file. Verify the registration wizard steps against actual source:
```bash
ls src/app/\[locale\]/list-your-camp/
cat src/app/\[locale\]/list-your-camp/page.tsx | grep -n "step\|Step\|sessionStorage" | head -20
cat src/app/\[locale\]/list-your-camp/branding/page.tsx | grep -n "step\|sessionStorage" | head -10
```

**Correct step order if wrong.** Based on sessionStorage keys and page guards:
- Step 1: `/list-your-camp` — Account (email, password, name) → saves `reg_step1`
- Step 2: `/list-your-camp/property` — Property details (name, slug, type, location, currency) → saves `reg_step2`
- Step 2.5: `/list-your-camp/branding` — Branding (colors, logo) → saves `reg_branding`
- Step 3: `/list-your-camp/plan` — Plan selection + payment (requires `reg_step1` + `reg_step2`)
- Step 4: `/list-your-camp/success` — Confirmation + dashboard link

**Add the plan comparison table** (verify from actual plan enforcement code):
```bash
grep -rn "basic\|premium\|ultimate" src/app/\[locale\]/owner/ --include="*.tsx" | grep -i "plan\|feature" | head -20
```

| Feature | Basic | Premium | Ultimate |
|---------|-------|---------|---------|
| Marketplace listing | ✅ | ✅ | ✅ |
| Custom subdomain | ❌ | ✅ | ✅ |
| Branded tenant website | ❌ | ✅ | ✅ |
| Custom domain | ❌ | ❌ | ✅ |

**Add Google OAuth login** — update "How to sign in" section to mention Google login button.

---

## File 8: `docs/user-guides/property-manager.md`

Read the current file. Update:

**1. Navigation** — verify actual sidebar items in the manage layout:
```bash
cat src/app/\[locale\]/manage/\[listingId\]/layout.tsx | grep -n "href\|NavItem\|Link" | head -30
```
Document every nav item that actually exists.

**2. Staff vs Manager permissions** — add a permissions table showing which pages staff cannot access (Finance, Plugins, Settings, Staff management).

**3. Plugin-driven pages** — note that Housekeeping, Maintenance, Operations, and Orders pages are only active when their respective plugins are enabled by the platform admin.

---

## File 9: `docs/user-guides/guest.md`

Read the current file. Update:

**1. Booking flow** — verify actual URL paths:
```bash
ls src/app/\[locale\]/book/
```
Document the actual steps: `/book/[propertyId]` → `/book/summary` → confirmation.

**2. Reservation management** — verify what actions are available:
```bash
grep -n "cancel\|Cancel\|invoice\|download" src/app/\[locale\]/guest/reservations/ -r --include="*.tsx"
```
Only document features that actually exist in the UI.

**3. Loyalty program** — document the `/en/loyalty` page only if it has real content. If it's a placeholder, note it as "coming soon".

---

## File 10: `docs/user-guides/master-admin.md`

Read the current file. Update:

**1. Admin routes** — verify all admin pages exist:
```bash
find src/app/\[locale\]/admin -name "page.tsx" | sort
```

**2. Impersonation** — document the current flow:
- Admin views listing at `/admin/listings/[id]`
- Clicks "Login as Owner" → calls `/api/admin/impersonate`
- Redirects to owner dashboard
- Session shows impersonation banner
- Click "Exit Impersonation" to return

**3. Plugin management** — document both levels:
- `/admin/plugins` — platform-level plugin catalog (enable/disable globally)
- `/admin/listings/[id]/config` — per-listing plugin enable/disable

**4. Metrics** — add section on accessing Prometheus metrics:
```
GET /api/metrics
Authorization: Bearer <METRICS_TOKEN>
```

---

## File 11: `docs/plugins/[each-plugin]/README.md`

For each plugin in `plugins/`, verify its README matches the actual source:
```bash
for plugin in plugins/*/; do
  name=$(basename "$plugin")
  echo "=== $name ==="
  # Check if README exists
  [ -f "docs/plugins/$name/README.md" ] && echo "✅ docs exist" || echo "❌ no docs"
  # Check if plugin.json exists
  [ -f "$plugin/plugin.json" ] && echo "✅ plugin.json" || echo "❌ missing plugin.json"
done
```

For each plugin with a `README.md`:
1. Verify the hook names listed match `packages/plugin-sdk/src/types.ts`
2. Verify the API routes listed match what's in `plugins/[name]/src/`
3. Verify the capabilities list matches `plugin.json`

For any plugin missing a `plugin.json`, create one following the booking plugin's structure.

---

## File 12: `docs/development/plugins.md`

Read the current file. Ensure it documents:
1. `PluginLoader.ts` — `activate()`, `deactivate()`, `scan()`, `init()`
2. `PluginBroker.ts` — cross-plugin event bus
3. `plugin-watchdog.ts` — crash recording and health reporting
4. `plugin-sandbox.ts` — capability enforcement
5. The transaction serialization queue (from the SQLite race condition fix)
6. The `_txQueue` pattern for why plugins must not bypass the wrapper

---

## Output

Create `docs/DOCS_UPDATE_REPORT.md` listing every file touched, what was stale, and what was corrected.

---

## Verification

```bash
npm test                                              # 1177 pass
npx playwright test --reporter=list 2>&1 | tail -3   # 376/376
```

Docs changes do not touch source — tests should trivially pass. If any test imports a doc file (unlikely), verify it still works.

---

## Commit

```bash
git add docs/ README.md
git commit -m "docs: sync all documentation to current implementation

- README: correct test counts (1177/376), architecture diagram, plugin list
- DEPLOYMENT.md: fix PostgreSQL→SQLite, add all new env vars, document PM2 cluster
- getting-started.md: update clone URL, env vars, test commands
- development/testing.md: document E2E structure, auth fixtures, CSRF helpers
- plugins/hook-catalog.md: verify all hook names against SDK constants
- plugin-development-guide.md: requireRole pattern, .js extensions, api.logger
- user-guides/*: correct wizard steps, plan features, staff permissions
- docs/DOCS_UPDATE_REPORT.md: full audit trail of changes"
```

---

## AGENT_LOGBOOK.md Entry

Append when done:
```markdown
## [DATE] — Documentation Sync

- Corrected DEPLOYMENT.md: PostgreSQL references removed, SQLite WAL documented
- Updated README: test counts, architecture diagram, plugin list
- Documented SQLite _txQueue serialization pattern in plugin-development-guide.md
- Hook catalog verified against SDK constants — [X fixes made / all correct]
- All user guides updated to reflect actual registration flow and plan features
- docs/DOCS_UPDATE_REPORT.md created with full change audit
```
