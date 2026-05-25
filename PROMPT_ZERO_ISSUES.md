# OpenCode Final Polish — Zero Skipped Tests, Zero Lint Issues

## Status

**Current**: 🟢 PRODUCTION READY with minor cleanup
- 127 test files, **1144 passing**, **18 skipped**
- Lint: 10 pre-existing `require()` errors + 1 unused-expression warning
- Build: Clean

**Target**: 🟢 **PERFECT STATE**
- 127 test files, **1144+ passing**, **0 skipped**
- Lint: **0 errors, 0 warnings**
- Build: Clean

---

## Phase 6: Eliminate All Skipped Tests (Priority: HIGH)

**Goal**: Convert 18 skipped tests to passing or remove if obsolete

### 6.1 Identify Skipped Tests

Run this to find all skipped tests:
```bash
npm run test -- --run 2>&1 | grep -A 2 "skipped"
```

Or search for skip patterns:
```bash
grep -r "\.skip\|it.skip\|describe.skip\|test.skip" src/ plugins/ --include="*.test.ts" --include="*.spec.ts"
grep -r "pending\|xit\|xdescribe" src/ plugins/ --include="*.test.ts" --include="*.spec.ts"
```

### 6.2 For Each Skipped Test, Do ONE of:

**Option A: Fix and Enable** (Preferred)
- Understand why it was skipped
- Fix the underlying issue
- Remove `.skip` and verify it passes

**Option B: Remove if Obsolete** (If test is for removed feature)
- Verify feature no longer exists
- Delete the test entirely

**Option C: Document and Keep Skip** (If skip is intentional and temporary)
- Add comment explaining why skip is needed
- Link to GitHub issue for tracking
- This should be < 3 cases max

### 6.3 Common Reasons for Skipped Tests

| Reason | Fix Strategy |
|--------|--------------|
| Feature not implemented yet | Remove test or implement feature |
| Test requires external service | Mock the service properly |
| Flaky test (timing issues) | Add proper async handling, retries |
| Database state pollution | Add proper test isolation |
| TypeScript errors | Fix type definitions |
| Auth/mock issues | Update test mocks for new auth patterns |

### 6.4 Test Files to Audit

Focus on these areas where skips commonly occur:
1. Plugin tests (newly created ones may have placeholder skips)
2. E2E tests (Playwright)
3. Integration tests with external APIs
4. Tests requiring specific database state

**Example Fix Pattern**:
```typescript
// BEFORE (skipped)
it.skip('should handle payment webhook', async () => {
  // Test code
});

// AFTER (fixed)
it('should handle payment webhook', async () => {
  // Mock the webhook payload
  const mockPayload = createMockWebhookPayload();
  
  // Mock idempotency check
  vi.spyOn(idempotency, 'check').mockResolvedValue(false);
  
  // Execute
  const result = await handleWebhook(mockPayload);
  
  // Assert
  expect(result.status).toBe(200);
});
```

---

## Phase 7: Eliminate All Lint Issues (Priority: HIGH)

**Goal**: Fix 10 `require()` errors + 1 unused-expression warning

### 7.1 Identify Lint Issues

```bash
npm run lint 2>&1 | grep -E "error|warning" | head -30
```

Or check specific files:
```bash
npx eslint src/ plugins/ --ext .ts,.tsx 2>&1 | grep "require()"
```

### 7.2 Fix `require()` Import Errors (10 issues)

**The Problem**: Using CommonJS `require()` instead of ES6 `import`

**The Fix**: Convert to ES6 imports

**Example**:
```typescript
// BEFORE (error)
const { someFunction } = require('./module');

// AFTER (fixed)
import { someFunction } from './module';
```

**Search for patterns**:
```bash
grep -r "require(" src/ plugins/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | head -20
```

**Common Locations**:
- Plugin entry points (`plugins/*/src/index.ts`)
- Dynamic imports that should be static
- Test utility files
- Migration scripts (may need different handling)

**Special Cases**:
- If `require()` is truly needed (dynamic conditional import), use:
  ```typescript
  const module = await import('./module');
  ```
- If it's in a `.js` file being imported to TS, consider converting to TS

### 7.3 Fix Unused Expression Warning (1 issue)

**The Problem**: Expression result not used (likely a mistake or incomplete code)

**Find it**:
```bash
npx eslint src/ plugins/ --ext .ts,.tsx 2>&1 | grep "unused"
```

**Common Causes**:
```typescript
// WRONG - expression has no effect
someFunction;  // Just referencing, not calling
a + b;        // Calculating but not using result

// WRONG - missing await (promise not handled)
asyncOperation();  // Returns promise but not awaited or used

// WRONG - void expression
console.log;  // Referencing instead of calling
```

**The Fix**:
```typescript
// CORRECT - call the function
someFunction();

// CORRECT - use the result
const result = a + b;

// CORRECT - handle promise
await asyncOperation();
// OR
void asyncOperation();  // Explicitly ignore

// CORRECT - call console
console.log('message');
```

---

## Phase 8: Final Verification & Documentation

### 8.1 Run Full Verification Suite

```bash
# 1. Test suite (expect 0 skipped)
npm run test -- --run
# Expected: "127 files, 1144 passed, 0 skipped"

# 2. Lint (expect 0 errors, 0 warnings)
npm run lint
# Expected: "✖ 0 problems (0 errors, 0 warnings)"

# 3. Build
npm run build
# Expected: Clean completion

# 4. Format check
npm run format:check
# Expected: No issues

# 5. Type check
npx tsc --noEmit
# Expected: No errors
```

### 8.2 Update Documentation

**Update these files with final status**:

1. **AGENT_LOGBOOK.md**
   ```markdown
   ### [2026-05-25] Final Polish — Zero Issues Achievement
   
   - **Task**: Eliminate all skipped tests and lint errors
   - **Phase 6**: Fixed 18 skipped tests → 0 skipped
     - [List specific tests fixed/removed]
   - **Phase 7**: Fixed 10 require() errors + 1 unused-expression warning → 0 issues
     - [List specific files changed]
   - **Final Results**:
     - Tests: 127 files, 1144 passed, **0 skipped**
     - Lint: 0 errors, 0 warnings
     - Build: Clean
   - **Status**: 🟢 **PERFECT STATE** — Zero issues, production perfect
   ```

2. **AGENT_AUDIT_FINDINGS.md**
   - Update sign-off table: All agents → ✅
   - Mark all issues as resolved
   - Final verdict: 🟢 PRODUCTION READY — ZERO ISSUES

3. **README.md**
   - Update test counts: "1144/1144 tests passing, 0 skipped"
   - Update status badge if applicable

4. **PRODUCTION_AUDIT_SUMMARY.md**
   - Final update with perfect metrics
   - Phase 6-7 completion notes

---

## Success Criteria

**PERFECT STATE achieved when ALL true**:
- ✅ 127 test files, **1144 passing**, **0 skipped**
- ✅ Lint: **0 errors, 0 warnings**
- ✅ Build: Clean
- ✅ Format check: Pass
- ✅ Type check: No errors
- ✅ Documentation updated

**Final Verdict**: 🟢 **PRODUCTION PERFECT** — Ready for high-scale deployment with confidence

---

## Execution Order

1. **@qa** → Phase 6 (skipped tests) — Work with @plugin_operations for plugin test fixes
2. **@security + @backend_architect** → Phase 7 (lint issues) — Split by file location
3. **@tech_writer** → Phase 8 (documentation) — Update all status files
4. **All agents** → Final verification run

---

## Quick Reference Commands

```bash
# Find skipped tests
grep -r "\.skip\|xit\|xdescribe" src/ plugins/ --include="*.test.ts"

# Find require() statements
grep -r "require(" src/ plugins/ --include="*.ts" | grep -v "node_modules"

# Run tests and see skipped count
npm run test -- --run 2>&1 | tail -10

# Run lint and see errors
npm run lint 2>&1 | grep -E "error|warning"
```

---

## Final Report Template

```markdown
## Production Readiness Final Report

### Perfect State Achievement

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Tests Passing | 1144 | 1144 | ✅ |
| Tests Skipped | 18 | 0 | ✅ |
| Lint Errors | 10 | 0 | ✅ |
| Lint Warnings | 1 | 0 | ✅ |
| Build | Clean | Clean | ✅ |

### Phases Complete
- ✅ Phase 1: Security (9 plugin routes authenticated)
- ✅ Phase 2: Monitoring (5 migrations, 6 error/loading files)
- ✅ Phase 3: Test Coverage (5 files, 42 tests)
- ✅ Phase 4: Database (table renaming, integrations)
- ✅ Phase 5: Polish (accessibility, mobile sidebar)
- ✅ Phase 6: Zero Skipped Tests (18 → 0)
- ✅ Phase 7: Zero Lint Issues (11 → 0)

### Files Changed
[List all files modified in Phases 6-7]

### Final Verdict
🟢 **PRODUCTION PERFECT** — Zero issues, comprehensive test coverage, 
clean codebase, full accessibility compliance, ready for enterprise deployment.

**Deployment Confidence**: MAXIMUM
**Code Quality**: EXCELLENT
**Maintainability**: HIGH
```

**Execute all phases. Deliver perfect codebase.**
