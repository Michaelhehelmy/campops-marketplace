---
name: fix-failing-test
description: Systematic approach to debugging and fixing a failing Vitest or Playwright test
---

## When to use
When a test is failing and you need to diagnose and fix the root cause.

## Diagnosis Steps

### For Vitest (unit/integration) failures:
1. Run the single failing test in verbose mode:
   ```bash
   npx vitest run --reporter=verbose path/to/test.ts
   ```
2. Check the error message carefully — is it:
   - **Import error** → wrong path, missing export, circular dependency
   - **Database error** → missing table, wrong column name, migration not applied
   - **Auth error** → test not mocking session correctly
   - **Type error** → TypeScript mismatch, usually a schema change
3. Check if a recent schema change renamed a column (e.g. `campops_version` → `platform_version`)
4. Check `src/lib/db.ts` migration runner — is the migration applied?

### For Playwright (E2E) failures:
1. Run with `--headed` to watch it fail:
   ```bash
   npx playwright test e2e/tests/failing.spec.ts --headed
   ```
2. Use the playwright MCP to take a screenshot at the failure point
3. Common causes:
   - **Selector not found** → element has wrong `data-testid`, or page hasn't loaded
   - **Timeout** → add `await page.waitForLoadState('networkidle')`
   - **Auth failure** → check test user seeding in `e2e/helpers/auth.fixture.ts`
   - **API 401/403** → CSRF token missing, session not established

## Fix Strategy

1. **Never skip** — fix the root cause, don't use `test.skip()`
2. **Check AGENTS.md section 14** for known resolved issues first
3. **Verify DB state** with sqlite MCP — does the data exist that the test expects?
4. **Isolate** — run just the failing test, not the whole suite
5. **Fix** the underlying code or test (not the assertion values)
6. **Verify** — run the full suite to confirm no regressions:
   ```bash
   npm run test        # unit
   npm run test:e2e    # E2E
   ```
