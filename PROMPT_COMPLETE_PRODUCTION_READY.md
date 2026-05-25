# OpenCode Production Readiness — Complete Remaining Phases

## Status Acknowledgment

**COMPLETED** (Verify these are done):
- ✅ Phase 1: Auth added to 9 plugin routes (housekeeping, maintenance, staff-roster, pos-kds, inventory-waste, guest-crm, ota-channel-manager, resource)
- ✅ Phase 1: Hook name mismatches fixed in src/lib/hooks.ts
- ✅ Phase 1: Hardcoded PII removed from staff-roster
- ✅ Phase 2: 5 DB migration SQL files created (OTA, housekeeping, maintenance, POS, inventory-waste)
- ✅ Phase 2: owner plugin.json manifest created
- ✅ Phase 2: error.tsx + loading.tsx created for admin/owner/manage dashboards
- ✅ Phase 2: console.error → api.logger.error in 3 plugins
- ✅ Documentation: README counts fixed, broken links repaired, AGENT_* files updated

**VERIFIED**: 122 test files passed, 1102 tests passed, 18 skipped — zero regressions

---

## Execute Remaining Phases

### Phase 3: Test Coverage (HIGH Priority)

**Goal**: Create minimum test stubs for 5 untested plugins

**Deliverables**:
```
plugins/housekeeping/src/__tests__/index.test.ts      (min 3 tests)
plugins/maintenance/src/__tests__/index.test.ts       (min 3 tests)
plugins/pos-kds/src/__tests__/index.test.ts          (min 3 tests)
plugins/inventory-waste/src/__tests__/index.test.ts  (min 3 tests)
plugins/staff-roster/src/__tests__/index.test.ts     (expand existing)
```

**Each test file must include**:
1. **Auth test**: Verify route returns 401 without session
2. **CRUD test**: Verify create/read/update/delete works with valid session
3. **Error test**: Verify 500 errors handled gracefully

**Template** (copy from plugins/resource/src/__tests__/):
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('PluginName API', () => {
  it('should require authentication', async () => {
    // Test without auth — expect 401
  });
  
  it('should create item with valid auth', async () => {
    // Mock session with role: 'manager'
    // Test POST /api/p/plugin-name/
  });
  
  it('should handle errors gracefully', async () => {
    // Test error case
    // Verify proper error response, not crash
  });
});
```

**Agent Assignment**: @qa (lead) + @plugin_operations (provide domain knowledge)

---

### Phase 4: Database Standardization (MEDIUM Priority)

**Goal**: Fix table naming inconsistency and runtime issues

**Tasks**:

#### 4.1 Standardize Table Names
Only `resource` uses `plugin_resource_listings` prefix. Others use raw names.

**Rename all to plugin-prefixed format**:
```sql
-- Migration file: plugins/housekeeping/migrations/002_rename_tables.sql
ALTER TABLE housekeeping_tasks RENAME TO plugin_housekeeping_tasks;

-- Migration file: plugins/maintenance/migrations/002_rename_tables.sql  
ALTER TABLE maintenance_requests RENAME TO plugin_maintenance_requests;

-- Migration file: plugins/pos-kds/migrations/002_rename_tables.sql
ALTER TABLE pos_orders RENAME TO plugin_pos_orders;

-- Migration file: plugins/inventory-waste/migrations/002_rename_tables.sql
ALTER TABLE inventory_items RENAME TO plugin_inventory_items;
ALTER TABLE waste_logs RENAME TO plugin_waste_logs;
```

**Update source files**:
- Search/replace table names in each plugin's `src/index.ts`
- Update any queries using old table names

#### 4.2 Create Missing Tables for Integrations
The `external_calendars` table and `ical_sync_url` column need to exist:

**Create**: `plugins/integrations/migrations/001_create_tables.sql`
```sql
CREATE TABLE IF NOT EXISTS external_calendars (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  sync_url TEXT,
  last_sync_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_calendars_property ON external_calendars(property_id);
```

#### 4.3 Verify Table Creation
Add runtime fallback in plugin `init()`:
```typescript
// In each plugin's init() function
async init(api) {
  // Ensure tables exist (creates if missing)
  await api.db.query(`CREATE TABLE IF NOT EXISTS plugin_${name}_items (...)`);
}
```

**Agent Assignment**: @db_architect (lead) + @plugin_integrations (for integrations tables)

---

### Phase 5: Infrastructure & Polish (MEDIUM Priority)

**Goal**: Fix remaining gaps from original audit

#### 5.1 Plugin Infrastructure (@pm, @backend_architect)

**Verify/fix**:
- [ ] `plugins/owner/plugin.json` exists and is valid JSON
- [ ] Search route handler exists: `src/app/api/public/search/route.ts` OR `plugins/search/src/index.ts`
- [ ] `available_themes` table populated: Run query `SELECT COUNT(*) FROM available_themes` — should be > 0
  - If empty: Seed with `camp-classic` theme
- [ ] Create missing `plugins/resource/tsconfig.json`

**Create search handler** (if missing):
```typescript
// src/app/api/public/search/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  // Implement search logic
  // Return properties matching query
  
  return NextResponse.json({ results: [] });
}
```

#### 5.2 Accessibility Fixes (@ux_designer)

**Fix 3 remaining gaps**:
1. **Add `aria-current` to active nav items**:
   - `src/components/Nav.tsx` — Add to active link
   - `src/components/ShopfrontNav.tsx` — Add to active link
   - `src/components/dashboard/Sidebar.tsx` — Add to active link

2. **Add `role="alert"` to error states**:
   - Find all error displays: `grep -r "error" src/components --include="*.tsx" | grep -i "error\|alert"`
   - Ensure 6/6 error states have `role="alert"` or `aria-live="polite"`

3. **Add `focus-visible` indicators**:
   - Add to `globals.css`:
   ```css
   .focus-visible\:ring:focus-visible {
     outline: 2px solid var(--brand-primary);
     outline-offset: 2px;
   }
   ```
   - Apply to all interactive elements (buttons, links, inputs)

#### 5.3 Mobile Sidebar (@frontend_dashboards)

**Create**: `src/components/dashboard/MobileSidebar.tsx`
```typescript
'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-md shadow"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
```

**Integrate into**:
- `src/app/[locale]/admin/layout.tsx`
- `src/app/[locale]/owner/layout.tsx`
- `src/app/[locale]/manage/[listingId]/layout.tsx`

#### 5.4 Final Documentation Pass (@tech_writer)

**Verify all documentation is accurate**:
- [ ] `README.md` — Test counts 1102/1102, 206/206 E2E
- [ ] `docs/index.md` — "1102+ tests" mentioned
- [ ] `PRODUCTION_READINESS_PLAN.md` — Mark resolved issues as ✅
- [ ] `AGENT_AUDIT_FINDINGS.md` — Update sign-offs for completed items
- [ ] `AGENT_LOGBOOK.md` — Log all phases completed

---

## Verification Checklist (Run After Each Phase)

### After Phase 3 (Tests):
```bash
# Run new tests
npm run test -- --run

# Should show:
# Test Files: 127+ passed (was 122, +5 new plugin test files)
# Tests: 1117+ passed (was 1102, +15 new tests minimum)
```

### After Phase 4 (DB):
```bash
# Verify tables exist
sqlite3 data/local.sqlite ".tables" | grep -E "plugin_" | wc -l
# Should show all plugin-prefixed tables

# Verify external_calendars exists
sqlite3 data/local.sqlite ".schema external_calendars"
```

### After Phase 5 (Polish):
```bash
# Build check
npm run build
# Should: Complete with 0 errors

# Lint check  
npm run lint
# Should: 0 errors, <5 warnings

# Full test suite
npm run test -- --run
# Should: All pass, no regressions
```

---

## Final Report Requirements

At completion, provide this structured report:

```markdown
## Production Readiness Completion Report

### Phases Completed

#### Phase 1: Security ✅
- [x] Auth added to 9 plugin routes
- [x] Hook name mismatches fixed
- [x] Hardcoded PII removed
- [x] console.error → logger

#### Phase 2: Stability ✅  
- [x] 5 DB migrations created
- [x] owner plugin.json created
- [x] error.tsx + loading.tsx for dashboards
- [x] Documentation updated

#### Phase 3: Test Coverage ✅
- [x] Test stubs created for 5 plugins
- [x] Minimum 3 tests per plugin
- [x] All tests passing

#### Phase 4: Database ✅
- [x] Tables renamed to plugin_* prefix
- [x] Integrations tables created
- [x] Runtime table creation added

#### Phase 5: Infrastructure ✅
- [x] Plugin infrastructure complete
- [x] Search handler created
- [x] available_themes populated
- [x] Accessibility fixes applied
- [x] Mobile sidebar added
- [x] Documentation finalized

### Test Results
```
Test Files  [N] passed | [N] skipped
     Tests  [N] passed | [N] skipped
  Build: ✅ Clean
  Lint: ✅ 0 errors
```

### Remaining Items (If Any)
- [ ] Item 1 — Priority: [HIGH/MEDIUM/LOW]
- [ ] Item 2 — Priority: [HIGH/MEDIUM/LOW]

### Files Created/Modified
[List all files changed]

### Final Verdict
🟢 **PRODUCTION READY** — All phases complete, all tests passing, all security issues resolved.

OR

🟡 **CONDITIONALLY READY** — [Explain what remains]
```

---

## Agent Coordination

**Work in this order**:
1. @qa + @plugin_operations → Phase 3 (tests)
2. @db_architect → Phase 4 (DB) 
3. @pm + @backend_architect + @frontend_dashboards + @ux_designer + @tech_writer → Phase 5 (polish)

**Communication**:
- Update `AGENT_LOGBOOK.md` after each phase
- Mark items complete in `AGENT_AUDIT_FINDINGS.md`
- Report blockers immediately

---

## Success Criteria

**Production Ready when ALL are true**:
- ✅ 0 unauthenticated API routes
- ✅ 0 runtime database errors
- ✅ All dashboards have error.tsx + loading.tsx
- ✅ 0 console.error in production code
- ✅ All plugins have minimum test coverage
- ✅ 0 hardcoded secrets or PII
- ✅ Table naming standardized (plugin_* prefix)
- ✅ Documentation accurate and consistent
- ✅ All tests passing (1102+ minimum)
- ✅ Build clean (0 errors)
- ✅ Accessibility: aria-current, role="alert", focus-visible
- ✅ Mobile responsive (sidebar)

**Execute all phases. Provide final report.**
