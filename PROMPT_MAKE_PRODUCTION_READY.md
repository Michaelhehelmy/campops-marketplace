# OpenCode Production Remediation Prompt

## Critical Analysis of Audit Results

**Status**: 🟡 CONDITIONALLY READY — Core platform deployable, plugin ecosystem BLOCKED
**Timeline**: 2-3 days to full production readiness
**Priority**: Security (auth gaps) → Stability (tests, error boundaries) → UX (a11y) → Documentation

---

## BLOCKING Issues (Fix Immediately)

### 🔴 P0: Plugin Authentication Crisis

**Affected**: @plugin_operations (6 plugins), @plugin_crm, @plugin_integrations

**Issues**:
1. **ZERO auth on all 6 operations plugin routes** — only staff-roster has inline `api.auth.getSession()`
2. **guest-crm routes unauthenticated** — guest data exposed
3. **OTA routes unauthenticated** — booking channel data exposed
4. **No `auth` declared in plugin capabilities** — even though PluginAPI has `auth.getSession()`

**Required Actions**:
```
1. Add `auth: true` to all plugin capabilities in plugin.json
2. Wrap all master/CRUD routes with authentication:
   - Use `api.auth.getSession()` for plugin routes
   - Or use shared `requireRole`/`requireSession` if plugin calls core API
3. Add role checks: 'manager', 'staff', 'master' as appropriate
4. Test each route with and without auth token
```

**Files to Fix**:
- `plugins/housekeeping/src/index.ts` — Add auth to all routes
- `plugins/maintenance/src/index.ts` — Add auth to all routes  
- `plugins/staff-roster/src/index.ts` — Expand inline auth to all routes, remove hardcoded phone
- `plugins/pos-kds/src/index.ts` — Add auth to all routes
- `plugins/resource/src/index.ts` — Add auth to all routes
- `plugins/inventory-waste/src/index.ts` — Add auth to all routes
- `plugins/guest-crm/src/index.ts` — Add auth to guest data routes
- `plugins/loyalty/src/index.ts` — Fix hook name mismatch
- `plugins/integrations/src/index.ts` — Add auth to OTA/calendar routes

---

### 🔴 P0: Database Runtime Failures

**Affected**: @plugin_integrations, @db_architect

**Issues**:
1. **`external_calendars` table doesn't exist** — 500 error at runtime
2. **`ical_sync_url` column missing** — silent skip instead of error
3. **Empty migration directories** — 4 plugins have no SQL to create tables

**Required Actions**:
```
1. Create missing tables:
   - `external_calendars` (plugin_integrations schema)
   - Add `ical_sync_url` column to relevant table
   
2. Write migrations for all empty directories:
   - plugins/housekeeping/migrations/
   - plugins/maintenance/migrations/
   - plugins/pos-kds/migrations/
   - plugins/inventory-waste/migrations/

3. Add runtime table creation in plugin init() as fallback
4. Test database operations in each plugin
```

**Files to Create**:
- `plugins/integrations/migrations/001_add_external_calendars.sql`
- `plugins/housekeeping/migrations/001_create_tables.sql`
- `plugins/maintenance/migrations/001_create_tables.sql`
- `plugins/pos-kds/migrations/001_create_tables.sql`
- `plugins/inventory-waste/migrations/001_create_tables.sql`

---

### 🔴 P0: Critical Hook Malfunction

**Affected**: @plugin_crm, @backend_architect

**Issue**: Loyalty hook name mismatch — "welcome points" hook never fires

**Required Actions**:
```
1. Audit all hook names in:
   - plugins/loyalty/src/index.ts (listeners)
   - src/lib/hooks.ts (emitter definitions)
   - Any plugin that emits the hook

2. Fix mismatches:
   - Find where welcome points SHOULD fire
   - Verify hook name consistency
   - Ensure payload shape matches listener expectations

3. Add hook name constants to prevent future mismatches
```

---

## HIGH Priority Issues (Fix Today)

### 🟠 P1: Dashboard Stability (@frontend_dashboards)

**Issues**:
- 0 error boundaries — any crash takes down entire dashboard
- 0 loading.tsx — no loading states
- 20+ console.error statements
- No mobile sidebar

**Required Actions**:
```
1. Add error.tsx files to all dashboard route segments:
   - src/app/[locale]/admin/error.tsx
   - src/app/[locale]/owner/error.tsx
   - src/app/[locale]/manage/[listingId]/error.tsx

2. Add loading.tsx files:
   - src/app/[locale]/admin/loading.tsx
   - src/app/[locale]/owner/loading.tsx
   - src/app/[locale]/manage/[listingId]/loading.tsx

3. Replace console.error with structured logger:
   - Find: grep -r "console.error" src/app/[locale]/admin src/app/[locale]/owner src/app/[locale]/manage
   - Replace with: logger.error('[ComponentName]', error)

4. Add mobile sidebar:
   - src/components/dashboard/MobileSidebar.tsx
   - Integrate into admin/owner/manage layouts
```

---

### 🟠 P1: Plugin Test Coverage Crisis (@plugin_operations, @qa)

**Issues**:
- 5/6 operations plugins have ZERO tests
- Only `resource` has tests (3 files, 60+)

**Required Actions**:
```
1. Create test structure for each plugin:
   plugins/{name}/src/__tests__/
   ├── index.test.ts (API routes)
   ├── db.test.ts (database operations)
   └── hooks.test.ts (if applicable)

2. Minimum test coverage per plugin:
   - Auth: Test with/without session
   - CRUD: Create, read, update, delete operations
   - Error handling: 400, 401, 403, 500 cases
   - Hooks: Verify listeners fire correctly

3. Use resource plugin as template:
   - Copy test patterns from plugins/resource/src/__tests__/
   - Adapt to each plugin's domain
```

**Files to Create** (example for housekeeping):
- `plugins/housekeeping/src/__tests__/index.test.ts`
- `plugins/housekeeping/src/__tests__/db.test.ts`

---

### 🟠 P1: Database Naming Inconsistency (@plugin_operations, @db_architect)

**Issues**:
- Only `resource` uses `plugin_resource_listings` prefix
- Others use raw names (`housekeeping_tasks`, `inventory_items`) — collision risk

**Required Actions**:
```
1. Rename all tables to plugin-prefixed format:
   - housekeeping_tasks → plugin_housekeeping_tasks
   - inventory_items → plugin_inventory_items
   - maintenance_requests → plugin_maintenance_requests
   - pos_orders → plugin_pos_orders
   
2. Update all queries in plugin source files
3. Create migration scripts for table renaming
4. Update PluginAPI table references if any
```

---

## MEDIUM Priority (Fix This Week)

### 🟡 P2: Accessibility Gaps (@ux_designer)

**Issues**:
- Missing `aria-current` on active navigation
- 3/6 error states lack `role="alert"`
- No `focus-visible` indicators

**Required Actions**:
```
1. Add aria-current to navigation:
   - src/components/Nav.tsx
   - src/components/ShopfrontNav.tsx
   - src/components/dashboard/Sidebar.tsx

2. Add role="alert" to error states:
   - Find error displays: grep -r "error" src/components --include="*.tsx" | grep -i "error"
   - Ensure 6/6 have role="alert" or aria-live

3. Add focus-visible styles:
   - tailwind.config.ts: add focusVisible variant
   - globals.css: add .focus-visible:ring classes
   - Apply to all interactive elements
```

---

### 🟡 P2: Plugin Infrastructure (@pm, @backend_architect)

**Issues**:
- Missing `plugins/owner/plugin.json`
- Missing search route handler
- Empty `available_themes` 

**Required Actions**:
```
1. Create plugins/owner/plugin.json:
   {
     "name": "owner",
     "version": "1.0.0",
     "capabilities": ["api", "auth"],
     "entry": "dist/index.js"
   }

2. Create search route handler:
   - src/app/api/public/search/route.ts (if missing)
   - Or plugins/search/src/index.ts

3. Populate available_themes:
   - Check database: SELECT * FROM available_themes
   - Seed with camp-classic theme if empty
   - Verify theme loader can resolve themes
```

---

### 🟡 P2: Documentation Cleanup (@tech_writer)

**Issues**:
- README test counts contradictory (1102 vs 1070)
- 8 critical inaccuracies
- Orphaned user-guides

**Required Actions**:
```
1. Fix all test count references:
   - README.md line 94: Verify 1102/1102
   - README.md line 182: Verify consistency
   - docs/index.md: Verify "1102+ tests"

2. Fix broken links:
   - DOCS/DEPLOYMENT.md → docs/DEPLOYMENT.md
   - Check all internal links

3. Consolidate or remove orphaned docs:
   - Find: find docs -name "*.md" -type f
   - Check which are unreferenced
   - Update or archive

4. Update PRODUCTION_READINESS_PLAN.md:
   - Mark resolved issues as complete
   - Add new issues discovered
```

---

### 🟡 P2: Code Quality (@security, All Agents)

**Issues**:
- Hardcoded PII: `staff-roster/src/index.ts` line 36 contains `'+1 234 567 890'`
- 2 plugins use console.error instead of api.logger.error
- Missing tsconfig.json in plugins/resource/

**Required Actions**:
```
1. Remove hardcoded PII:
   - plugins/staff-roster/src/index.ts:36
   - Replace with null or require actual data

2. Fix logging:
   - grep -r "console.error" plugins/
   - Replace with api.logger.error

3. Create tsconfig.json:
   - plugins/resource/tsconfig.json
   - Copy from another working plugin

4. Add lint rule to prevent hardcoded PII
```

---

## LOW Priority (Post-Launch Cleanup)

- Marketing automation placeholder (plugins/marketing-automation/)
- Dual router patterns (standardize on registerRoute or Hono)
- 9 require() warnings in build

---

## Execution Order

### Phase 1: Security (Day 1 — Critical)
- [ ] Add auth to all 9 unauthenticated plugin routes
- [ ] Create missing database tables
- [ ] Fix loyalty hook name mismatch
- [ ] Remove hardcoded PII

### Phase 2: Stability (Day 1-2 — High)
- [ ] Add error.tsx and loading.tsx to all dashboards
- [ ] Replace console.error with logger
- [ ] Create plugin migrations
- [ ] Add mobile sidebar

### Phase 3: Testing (Day 2 — High)
- [ ] Create test files for 5 untested plugins
- [ ] Minimum 3 tests per plugin (auth + CRUD + error)

### Phase 4: Polish (Day 2-3 — Medium)
- [ ] Fix accessibility gaps (aria-current, role="alert", focus-visible)
- [ ] Fix documentation inaccuracies
- [ ] Create missing plugin.json files
- [ ] Fix test count contradictions

### Phase 5: Database (Day 3 — Medium)
- [ ] Rename tables to plugin-prefixed format
- [ ] Standardize on consistent naming

---

## Verification Steps

After each phase, run:

```bash
# 1. Security check
grep -r "registerRoute.*POST\|registerRoute.*PUT\|registerRoute.*DELETE" plugins/ | grep -v "auth\|requireRole" | wc -l
# Should return: 0

# 2. Test check
npm run test -- --run
# Should pass: 1102+ tests (plus new plugin tests)

# 3. Build check
npm run build
# Should: Complete with 0 errors

# 4. Lint check
npm run lint
# Should: 0 errors, minimize warnings

# 5. Database check
# Verify all plugin tables exist
# Verify all migrations applied
```

---

## Deliverables

Update these files as you progress:

1. **AGENT_AUDIT_FINDINGS.md**
   - Mark resolved issues as ✅
   - Add new findings if discovered
   - Update sign-off table

2. **AGENT_LOGBOOK.md**
   - Append task logs for each fix
   - Document gotchas discovered

3. **PRODUCTION_AUDIT_SUMMARY.md**
   - Update verdict as issues resolve
   - Change from "CONDITIONALLY READY" to "READY"

4. **Create PROGRESS_TRACKING.md** (new file)
   - Track each issue with status
   - Assign to agents
   - Mark completion dates

---

## Success Criteria

**Production Ready when**:
- ✅ 0 unauthenticated API routes (core + plugins)
- ✅ 0 runtime database errors
- ✅ All dashboard routes have error.tsx + loading.tsx
- ✅ 0 console.error in production code
- ✅ All plugins have minimum test coverage (3+ tests each)
- ✅ 0 hardcoded secrets or PII
- ✅ Documentation accurate and consistent
- ✅ 1102+ tests passing
- ✅ Build clean (0 errors, <5 warnings)

**Final Verdict Target**: 🟢 **PRODUCTION READY**

---

## Agent Assignments

| Agent | Primary Responsibility | Files to Focus On |
|-------|----------------------|-------------------|
| @plugin_operations | Auth + tests for 6 plugins | plugins/*/src/index.ts, __tests__/ |
| @plugin_crm | CRM auth + hook fix | plugins/guest-crm/, plugins/loyalty/ |
| @plugin_integrations | OTA auth + DB tables | plugins/integrations/, migrations/ |
| @frontend_dashboards | Error boundaries + loading | src/app/[locale]/admin/, owner/, manage/ |
| @db_architect | Migrations + table naming | plugins/*/migrations/, schema fixes |
| @auth_agent | Auth pattern standardization | Review all plugin auth implementations |
| @ux_designer | Accessibility fixes | src/components/Nav.tsx, error states |
| @tech_writer | Documentation accuracy | README.md, docs/, fix contradictions |
| @pm | Plugin infrastructure | plugin.json files, available_themes |
| @backend_architect | Hook system fix | src/lib/hooks.ts, loyalty plugin |
| @qa | Test coverage | Create plugin test suites |
| @security | Security review | Verify auth on all routes |

**Execute immediately. Report progress every 2 hours. Update deliverables as you complete.**
