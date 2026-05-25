# OpenCode Agent Prompt: Review and Refine Plugin Documentation

## Task Objective

Review the plugin documentation files just created in `/docs/plugins/` against the actual plugin source code. Identify inaccuracies and make precise corrections. Do NOT rewrite everything—only fix what is actually wrong.

## Context

**What Was Created:**
- 24 plugin documentation folders in `/docs/plugins/`
- ~85 markdown files total
- Each plugin has: README.md, api.md, configuration.md (and user-guide.md for 6 complex plugins)
- Documentation was created based on PROMPT_FINAL_EXECUTION.md templates, not by analyzing actual code

**Potential Issues:**
- API endpoints may not match actual routes
- Database table names may be incorrect
- Configuration options may differ from actual implementation
- Hooks mentioned may not exist
- Plugin capabilities may be overstated

## Review Process

### Step 1: Plugin-by-Plugin Code Analysis

For each of the 24 plugins, do the following:

```
plugins/[PLUGIN_NAME]/
├── src/index.ts          ← Read this first (initialization, tables, hooks)
├── src/routes/*.ts       ← Read all route files (actual API endpoints)
├── src/ui.tsx            ← Read if exists (UI components)
└── __tests__/*.ts        ← Optional: see how plugin is actually used
```

### Step 2: Documentation Verification Checklist

For each plugin doc, verify:

#### README.md
- [ ] **Plugin description** matches actual functionality
- [ ] **Features listed** actually exist in code
- [ ] **Database tables** names are correct (`plugin_*` prefix accurate?)
- [ ] **Indexes mentioned** actually created in `init()`
- [ ] **Related plugins** correctly linked

#### api.md
- [ ] **Base URL** is correct (check `registerRoute` calls)
- [ ] **All endpoints** documented actually exist in route files
- [ ] **HTTP methods** match (GET/POST/PATCH/DELETE)
- [ ] **Request/response schemas** match actual Zod schemas or shapes
- [ ] **Query parameters** actually used in routes
- [ ] **Hooks mentioned** actually registered/emitted
- [ ] **Error codes** are realistic (check error handling in routes)

#### configuration.md
- [ ] **Enable steps** are correct
- [ ] **Configuration options** actually exist (check for settings/db columns)
- [ ] **Environment variables** actually used
- [ ] **Code examples** use correct syntax
- [ ] **Troubleshooting** covers real issues

#### user-guide.md (if exists)
- [ ] **Workflows described** are possible with actual UI
- [ ] **Screens/buttons mentioned** actually exist
- [ ] **Role permissions** match actual auth checks

### Step 3: Correction Strategy

**DO:**
- Fix incorrect table names
- Correct API endpoint paths
- Remove features that don't exist
- Add missing endpoints discovered in code
- Update hooks to match actual hook names
- Fix configuration option names

**DON'T:**
- Rewrite entire files if only minor fixes needed
- Add speculative features
- Change documentation structure
- Add new files unless absolutely necessary
- Rewrite correct information

### Step 4: Priority Order

Review plugins in this priority (most critical first):

**P0 - Critical Plugins (highest usage):**
1. booking
2. housekeeping
3. maintenance
4. pos-kds

**P1 - Important Plugins:**
5. loyalty
6. crm
7. inventory-waste
8. staff-roster
9. ota-channel-manager

**P2 - Supporting Plugins:**
10. financial-ops
11. accounting
12. hr-core
13. marketing-automation
14. subscriptions
15. activities

**P3 - Integration Plugins:**
16. guest-crm
17. ical
18. integrations
19. paymob
20. ical-import
21. siteminder

**P4 - Framework Plugins:**
22. resource
23. listing-admin
24. owner
25. pwa

## Common Corrections to Look For

### API Endpoints
Template may say:
```
POST /api/p/booking/create
```

But actual code may be:
```typescript
api.registerRoute('/api/p/booking/check-availability', ...)
api.registerRoute('/api/p/booking/create-booking', ...)  // note different path
```

### Database Tables
Template may say:
```
- `plugin_booking_bookings`
```

But actual code may be:
```typescript
await api.db.createTable('bookings', ...)  // actual name
```

### Hooks
Template may say:
```
- `BOOKING_CREATED`
```

But actual code may be:
```typescript
api.registerHook('booking:created', ...)  // different format
```

### Configuration
Template may suggest configuration options that don't exist in code. Remove or correct these.

## Execution Steps

### Phase 1: Critical Plugins (P0)
**Agent Assignment**: @plugin_booking + @backend_architect

1. Read actual plugin code for booking, housekeeping, maintenance, pos-kds
2. Compare with docs/plugins/{booking,housekeeping,maintenance,pos-kds}/
3. Make minimal edits to correct inaccuracies
4. Commit changes

### Phase 2: Important Plugins (P1)
**Agent Assignment**: @plugin_crm + @plugin_operations

1. Review loyalty, crm, inventory-waste, staff-roster, ota-channel-manager
2. Correct documentation
3. Commit

### Phase 3: Supporting + Integration + Framework (P2-P4)
**Agent Assignment**: @backend_architect + @tech_writer

1. Review remaining 15 plugins
2. Batch corrections
3. Commit

## Verification Commands

After corrections:

```bash
# Count total doc files
find docs/plugins -name "*.md" | wc -l
# Should be ~85

# Check for broken links (if link checker available)
npm run docs:check-links 2>/dev/null || echo "No link checker"

# Run tests to ensure no regressions
npm test
```

## Success Criteria

- [ ] All 24 plugin docs reviewed against actual code
- [ ] API endpoints match actual registered routes
- [ ] Database table names are accurate
- [ ] Hooks match actual hook registrations
- [ ] Configuration options exist in code
- [ ] Tests still pass (1159/1159)
- [ ] Only necessary corrections made (minimal changes)

## Output Format

For each plugin reviewed, report:

```
## [Plugin Name]
- Status: [Corrected / No Changes Needed / Minor Fixes]
- Issues Found:
  - [List specific corrections made]
- Files Modified:
  - [List files edited]
```

## Example Correction

**Before (in docs/plugins/booking/api.md):**
```markdown
### Create Booking
```http
POST /api/p/booking/create
```
```

**After (corrected):**
```markdown
### Create Booking
```http
POST /api/p/booking/create-booking
```
```

**Reason**: Actual code registers `/api/p/booking/create-booking` not `/api/p/booking/create`

---

**Execute this review process. Make only necessary corrections. Maintain documentation quality while ensuring accuracy.**
