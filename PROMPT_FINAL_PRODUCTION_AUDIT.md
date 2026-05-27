# OpenCode Agent Prompt: Final Production Readiness Audit

## Mission

Perform a complete, layer-by-layer production readiness audit. Fix every blocking issue. Do not stop until all acceptance criteria at the bottom of this document are met.

**Read before starting:**
- `AGENT_LOGBOOK.md` — ALL sections, especially Persistent Learnings
- `PROMPT_MILITARY_GRADE.md` — infrastructure hardening plan (Phases 1–7)

**Test baseline to maintain:**
```bash
npm test                          # must stay ≥ 1177 unit tests passing
npx playwright test --reporter=list 2>&1 | tail -3  # must stay 376/376
```

---

## Layer 1 — Critical Code Bugs (BLOCKING — fix first)

These are confirmed bugs documented in `AGENT_LOGBOOK.md`. They will cause production failures.

### 1.1 Plugin Auth Gaps — ZERO auth on Operations, CRM, and Integration routes

**From logbook**: *"Operations, CRM, and Integration plugins have critical auth gaps. Ops routes (housekeeping, maintenance, roster, POS) and integration routes (ota-channel-manager) have ZERO authentication."*

**Files to audit:**
```
plugins/operations/src/
plugins/crm/src/
plugins/integrations/src/
```

For each plugin, open the routes file (usually `src/index.ts` or `src/api/routes.ts`) and find every `api.registerRoute(...)` or `app.use(...)` call. Any route that modifies data (POST, PATCH, PUT, DELETE) without calling `api.auth.getSession(req)` or equivalent is a critical vulnerability.

**Fix pattern** (add to every unprotected route handler):
```typescript
// At the top of every PATCH/POST/PUT/DELETE handler:
const session = await api.auth.getSession(req);
if (!session) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
// For manager/staff-only routes, also check role:
const allowedRoles = ['manager', 'master', 'staff'];
if (!allowedRoles.includes(session.user.role)) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

After fixing, add a test for each plugin's most sensitive route in `e2e/tests/core/auth-gaps.spec.ts`:
```typescript
// Add to the PROTECTED_PLUGIN_ROUTES array:
{ method: 'POST', path: '/api/p/operations/housekeeping', body: {} },
{ method: 'POST', path: '/api/p/operations/maintenance', body: {} },
{ method: 'POST', path: '/api/p/crm/campaigns', body: {} },
{ method: 'POST', path: '/api/p/integrations/sync', body: {} },
```
Expect each to return `401` when called without auth.

### 1.2 Hook Name Mismatch — Loyalty plugin will never fire

**From logbook**: *"`@sinaicamps/plugin-sdk` defines `Hooks.BOOKING_CREATED` as `'transaction:created'` but the booking plugin fires `'BOOKING_CREATED'` as a raw string. The loyalty plugin subscribes to `Hooks.BOOKING_CREATED` — it will never fire."*

**Files to fix:**
1. Find where the booking plugin fires the hook:
   ```bash
   grep -rn "BOOKING_CREATED\|transaction:created\|doAction\|fireHook" plugins/booking/src/ --include="*.ts"
   ```
2. Find what the SDK defines:
   ```bash
   grep -rn "BOOKING_CREATED\|transaction:created" packages/plugin-sdk/src/ --include="*.ts"
   ```
3. Fix: the booking plugin must use `Hooks.BOOKING_CREATED` (import from SDK), not a raw string literal.

**Fix pattern:**
```typescript
// In booking plugin, replace:
await api.hooks.doAction('BOOKING_CREATED', { bookingId, propertyId, guestId });

// With:
import { Hooks } from '@sinaicamps/plugin-sdk';
await api.hooks.doAction(Hooks.BOOKING_CREATED, { bookingId, propertyId, guestId });
```

Also check `Hooks.GUEST_CHECKED_OUT` vs `'CHECKOUT_COMPLETED'` and fix the same way.

After fixing, run existing hook integration tests:
```bash
npx vitest run src/lib/__tests__/plugin-ecosystem.test.ts
npx vitest run src/lib/__tests__/plugin-inits.test.ts
```

### 1.3 Missing `plugin.json` in Owner Plugin

**From logbook**: *"`plugins/owner/` directory is missing `plugin.json` manifest."*

Check if it exists:
```bash
ls plugins/owner/plugin.json 2>/dev/null || echo "MISSING"
```

If missing, create `plugins/owner/plugin.json`:
```json
{
  "id": "owner",
  "name": "Owner Portal",
  "version": "1.0.0",
  "description": "Owner dashboard, branding, domain management, and plan upgrades",
  "author": "SinaiCamps",
  "campopsVersion": ">=1.0.0",
  "capabilities": ["auth", "db"],
  "hooks": {
    "listen": [],
    "fire": []
  },
  "reviewStatus": "core",
  "enabled": true
}
```

Verify the PluginLoader can discover it:
```bash
npx vitest run src/lib/__tests__/plugin-loader.test.ts
```

### 1.4 Dual Deployment Docs Conflict

**From logbook**: *"`docs/deployment.md` (lowercase, stale Vercel/Docker) and `docs/DEPLOYMENT.md` (uppercase, current Nginx/Oracle) both exist with contradictory instructions. Delete lowercase file."*

```bash
ls docs/deployment.md docs/DEPLOYMENT.md 2>&1
```

If both exist: delete the lowercase (stale) one:
```bash
# This is safe — verified stale by logbook entry
git rm docs/deployment.md
```

---

## Layer 2 — Infrastructure Hardening (from `PROMPT_MILITARY_GRADE.md`)

**Execute PROMPT_MILITARY_GRADE.md in full.** All 7 phases are documented there with exact file contents. Do not skip phases. Summary of what each phase delivers:

| Phase | What it delivers | Critical for |
|-------|-----------------|-------------|
| 1 — Zero-Downtime | PM2 cluster mode, health-check script, deploy rollback, nginx timeouts | Live deploys |
| 2 — Observability | Prometheus metrics, Grafana, AlertManager, alert rules | Incident detection |
| 3 — DB Resilience | WAL tuning, backup integrity check, restore test, cron setup | Data safety |
| 4 — Security | HMAC role cookies (already done), CSP nonce, rate-limit plugin routes, Dependabot | Security posture |
| 5 — SLOs & Runbooks | SLO.md, app-crash, db-lock, high-memory runbooks | Incident response |
| 6 — Chaos Testing | `scripts/chaos-test.sh`, DB lock simulation, `.github/workflows/chaos-weekly.yml` | Resilience verification |
| 7 — Maintenance | Session cleanup cron, stale data purge, dependency audit automation | Long-term ops |

**After each phase**, run:
```bash
npm test && npx playwright test --reporter=list 2>&1 | tail -3
```
Both must pass before moving to the next phase.

---

## Layer 3 — Error Boundaries (No crash pages in dashboards)

**From logbook**: *"The `/admin/`, `/owner/`, and `/manage/[listingId]/` directories have zero `error.tsx` files. Any runtime error will show Next.js's generic error screen."*

Create `error.tsx` in each dashboard directory. Use the same minimal pattern for all three:

**File:** `src/app/[locale]/admin/error.tsx`
**File:** `src/app/[locale]/owner/error.tsx`
**File:** `src/app/[locale]/manage/[listingId]/error.tsx`

```typescript
'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
      <p className="text-gray-500 text-sm text-center max-w-md">
        An unexpected error occurred. Please try again.
        {error.digest && (
          <span className="block mt-1 text-xs text-gray-400">Error ID: {error.digest}</span>
        )}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
      >
        Try again
      </button>
    </div>
  );
}
```

Verify each file exists and TypeScript compiles:
```bash
npx tsc --noEmit 2>&1 | head -20
```

---

## Layer 4 — RTL Support for Arabic

**From E2E findings**: Arabic pages at `/ar/*` do not set `dir="rtl"` on the `<html>` element. This breaks RTL layout for Arabic users.

**Find the root layout file:**
```bash
find src/app -name "layout.tsx" | head -5
```

The root layout `src/app/[locale]/layout.tsx` (or similar) renders the `<html>` tag. It receives the `locale` parameter from Next.js.

**Fix:**
```typescript
// In the RootLayout component, update the <html> tag:
export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const isRtl = locale === 'ar'; // extend if more RTL locales added

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <body>{children}</body>
    </html>
  );
}
```

**Update the test** in `e2e/tests/responsive/locale.spec.ts` — change the soft-warning RTL test back to a hard assertion:
```typescript
test('Arabic page has dir=rtl on html element', async ({ page }) => {
  await page.goto('/ar');
  const dir = await page.locator('html').getAttribute('dir');
  expect(dir).toBe('rtl');
});
```

---

## Layer 5 — Code Quality Audit

### 5.1 Migrate console.log to structured logger

**From logbook**: *"Remaining minor items: migrate console.log to structured logger."*

Find all `console.log` in `src/` (not in tests):
```bash
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v ".test." | wc -l
```

If count > 20, create a migration plan. For each `console.log` in an API route or server-side code, replace with the project logger:
```typescript
// Find the logger import pattern used in this codebase:
grep -rn "import.*logger\|require.*logger" src/ --include="*.ts" | head -5

// Replace:
console.log('[BookingPlugin] Received check-availability request:', JSON.stringify(body));
// With:
logger.info({ event: 'booking.check-availability', body }, 'Check availability request');
```

Do NOT replace `console.log` in client components (`'use client'` files) — only server-side code.

### 5.2 Add Zod validation to unvalidated API routes

**From logbook**: *"add Zod validation to 12 routes"*

Find routes that parse `req.json()` without validation:
```bash
grep -rn "req\.json()" src/app/api/ --include="*.ts" -l
```

For each route, check if there's a `z.parse()` or `z.safeParse()`. If not, add it. Pattern:
```typescript
import { z } from 'zod';

const UpgradeSchema = z.object({
  siteId: z.string().min(1),
  newPlan: z.enum(['basic', 'premium', 'ultimate']),
  customDomain: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const raw = await req.json();
  const parsed = UpgradeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  // use parsed.data from here on
}
```

### 5.3 TypeScript strict mode check

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0 type errors"
```

Fix any type errors. Do not suppress with `// @ts-ignore` unless with a comment explaining why.

---

## Layer 6 — Security Verification

Run these checks and fix any findings:

### 6.1 npm audit
```bash
npm audit --audit-level=high 2>&1
```
Fix all HIGH and CRITICAL findings. If a fix breaks tests, document in logbook.

### 6.2 Secrets scan
```bash
# Check for hardcoded secrets
grep -rn "sk_live\|pk_live\|password123\|secret_key\|api_key" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__\|.test.\|.spec." | grep -v ".env"
```
Any real secret in source code = **CRITICAL**, remove immediately.

### 6.3 Verify no test bypass code in production paths
```bash
grep -rn "SKIP_PAYMENT_GATE\|NODE_ENV.*test\|process.env.TEST" src/app/api/ --include="*.ts" | grep -v "__tests__"
```
All `SKIP_PAYMENT_GATE` refs must be in environment-gated blocks (`if (process.env.SKIP_PAYMENT_GATE === 'true')`), never unconditionally true.

### 6.4 Verify CORS and trusted origins
```bash
grep -rn "trustedOrigins\|Access-Control-Allow-Origin" src/ --include="*.ts" | head -10
```
`trustedOrigins` must be an async function querying verified custom domains from DB (per logbook gotcha).

---

## Layer 7 — Final Test Run

Run the complete suite with coverage report:

```bash
# Unit tests
npm test -- --reporter=verbose 2>&1 | tail -20

# E2E tests (all projects)
npx playwright test --reporter=list 2>&1 | tail -5

# E2E mobile project
npx playwright test --project=mobile-chrome --reporter=list 2>&1 | tail -5
```

### Acceptance criteria to pass before declaring "production ready"

All of these must be true simultaneously:

- [ ] `npm test` → all unit tests pass (≥ 1177)
- [ ] `npx playwright test` → 376/376 green, 0 failed, 0 skipped
- [ ] `npm audit --audit-level=high` → 0 HIGH or CRITICAL vulnerabilities
- [ ] `npx tsc --noEmit` → 0 type errors (after running `npm run build` first)
- [ ] `npm run lint` → 0 errors (pre-existing `no-require-imports` warnings are OK)
- [ ] Every `api.registerRoute` in Operations, CRM, Integration plugins has auth guard
- [ ] `plugins/owner/plugin.json` exists and PluginLoader test passes
- [ ] `Hooks.BOOKING_CREATED` and `Hooks.GUEST_CHECKED_OUT` use SDK constants in booking plugin
- [ ] `error.tsx` exists in `/admin/`, `/owner/`, `/manage/[listingId]/`
- [ ] Arabic pages have `dir="rtl"` on `<html>` element
- [ ] No hardcoded secrets in source code
- [ ] All 7 phases of `PROMPT_MILITARY_GRADE.md` implemented and verified
- [ ] `AGENT_LOGBOOK.md` updated with this session's changes

---

## Commit Strategy

Group changes into these commits:

```bash
# 1. Critical bug fixes
git add plugins/operations/ plugins/crm/ plugins/integrations/ plugins/owner/plugin.json
git commit -m "fix(plugins): add auth guards to Operations/CRM/Integration routes; add owner plugin.json"

git add plugins/booking/src/
git commit -m "fix(hooks): use Hooks SDK constants in booking plugin — BOOKING_CREATED, GUEST_CHECKED_OUT"

# 2. Error boundaries
git add "src/app/[locale]/admin/error.tsx" "src/app/[locale]/owner/error.tsx" "src/app/[locale]/manage/[listingId]/error.tsx"
git commit -m "feat(ux): add error.tsx to all dashboard directories"

# 3. RTL support
git add src/app/
git commit -m "feat(i18n): set dir=rtl on html element for Arabic locale"

# 4. Infrastructure (per phase)
git commit -m "feat(infra): Phase 1 — PM2 cluster, health check, deploy rollback"
git commit -m "feat(infra): Phase 2 — Prometheus metrics, Grafana, AlertManager"
git commit -m "feat(infra): Phase 3 — DB WAL tuning, backup integrity, restore test"
git commit -m "feat(infra): Phase 4 — Security: CSP nonce, plugin rate limits, Dependabot"
git commit -m "feat(infra): Phase 5 — SLOs and incident runbooks"
git commit -m "feat(infra): Phase 6 — Chaos testing scripts and weekly CI job"
git commit -m "feat(infra): Phase 7 — Maintenance automation crons"

# 5. Code quality
git commit -m "refactor(api): add Zod validation to 12 unvalidated routes"
git commit -m "refactor(logging): migrate console.log to structured logger in server code"

# 6. Push everything
git push origin main
```

---

## AGENT_LOGBOOK.md Entry

Append when done:

```markdown
## [DATE] — Final Production Readiness Audit

### What was done
- Fixed plugin auth gaps: Operations, CRM, and Integration plugins now have getSession() on all routes
- Fixed hook name mismatch: booking plugin now uses Hooks.BOOKING_CREATED from SDK
- Created plugins/owner/plugin.json manifest
- Deleted stale docs/deployment.md (Vercel/Docker instructions)
- Added error.tsx to /admin/, /owner/, /manage/[listingId]/
- Added dir=rtl to Arabic locale root layout
- Implemented all 7 phases of PROMPT_MILITARY_GRADE.md
- Added Zod validation to [N] routes
- Migrated [N] console.log calls to structured logger
- npm audit: 0 HIGH/CRITICAL vulnerabilities

### Test counts after
- Unit tests: [N] passing
- E2E tests: 376/376 passing

### Ship criteria: ALL MET
```
