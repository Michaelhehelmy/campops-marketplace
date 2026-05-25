# OpenCode Multi-Agent Production Audit Prompt

## Objective
Conduct a comprehensive production readiness audit across all domains of the SinaiCamps marketplace platform using all available OpenCode agents and tools. Verify 100% that the application is production-ready and update all documentation to reflect actual implementation.

## Context
This is a Next.js 14 multi-tenant hospitality marketplace with:
- 28 plugins (booking, payments, CRM, operations, integrations)
- Multi-tenancy (subdomain + custom domain)
- Stripe + Paymob payment processing
- better-auth authentication
- 1102+ tests

Previous audit completed May 25, 2026 — this is a verification/revision pass.

## Available Agents (Dispatch All)

```
@frontend_marketplace - Public UI, homepage, shopfront components
@frontend_dashboards - Admin, owner, manage dashboard panels  
@backend_architect - Core framework, plugin engine, bootstrap
@auth_agent - Authentication, authorization, sessions, middleware
@plugin_payments - Stripe, Paymob, webhooks, commissions
@plugin_operations - Housekeeping, maintenance, roster, POS
@plugin_crm - Loyalty, guest journeys, marketing automation
@plugin_integrations - iCal, OTA sync, third-party integrations
@db_architect - Database schema, migrations, query optimization
@devops - CI/CD, deployment, PM2, nginx, Docker
@security - Security headers, CSP, secrets, vulnerabilities
@theme_designer - Design tokens, themes, UI consistency
@qa - Test coverage, E2E gaps, regression risks
@ux_designer - Accessibility, mobile UX, responsiveness
@tech_writer - Documentation accuracy, API docs, guides
@pm - Feature completeness, user stories, acceptance criteria
```

## Required Tools (Use All Applicable)

```
code_search - Deep codebase exploration
grep_search - Pattern matching for security/code quality
find_by_name - File discovery
read_file - File content verification
list_dir - Directory structure analysis
run_command - Test execution, build verification
check_deploy_status - If applicable
```

## Audit Checklist (All Agents Must Verify)

### Security & Auth (@security, @auth_agent)
- [ ] All `/api/*` routes have authentication (requireRole/requireSession)
- [ ] No hardcoded secrets, API keys, or passwords in source
- [ ] CSP headers configured (check middleware.ts)
- [ ] Rate limiting active on all API prefixes
- [ ] Session cookies: secure, httpOnly, sameSite
- [ ] CSRF protection on mutating requests
- [ ] Input validation on all API routes (Zod/schemas preferred)
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (output encoding in components)

### Code Quality (All Agents)
- [ ] No `console.log` in production code (use structured logger)
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling with user-friendly messages
- [ ] No TODO/FIXME comments without GitHub issues
- [ ] Consistent code style (ESLint/Prettier passing)

### Database (@db_architect)
- [ ] All hot query paths have indexes
- [ ] No N+1 query problems
- [ ] Transaction safety for multi-step operations
- [ ] Proper connection pooling (PG) or single-instance (SQLite)
- [ ] Migration files up to date

### Performance (All Agents)
- [ ] Database query optimization
- [ ] Image optimization implemented
- [ ] Bundle size considerations
- [ ] Caching strategies where applicable
- [ ] No memory leaks in long-running processes

### Reliability (@backend_architect, @devops)
- [ ] Graceful error boundaries in UI
- [ ] Fallback UI for all async operations
- [ ] Idempotency on critical operations (payments, webhooks)
- [ ] Circuit breakers for external APIs
- [ ] Health check endpoint functional
- [ ] PM2/Process management configured
- [ ] Backup system operational

### Accessibility (@ux_designer, @frontend_*)
- [ ] WCAG 2.1 AA compliance
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] ARIA labels and roles
- [ ] Keyboard navigation works
- [ ] Focus management (visible focus indicators)
- [ ] Color contrast ratios (4.5:1 minimum)
- [ ] Screen reader compatibility

### Testing (@qa)
- [ ] Unit test coverage > 80%
- [ ] E2E tests for critical user paths
- [ ] All tests passing (1102+ expected)
- [ ] No flaky tests
- [ ] Integration tests for APIs

### Infrastructure (@devops)
- [ ] CI/CD pipeline functional
- [ ] Deployment scripts tested
- [ ] Environment variables documented
- [ ] SSL certificates configured
- [ ] Nginx reverse proxy working
- [ ] Database backup system

### Documentation (@tech_writer)
- [ ] README.md current and accurate
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] Architecture decisions recorded
- [ ] Plugin development guide current

## Execution Steps

### Phase 1: Parallel Domain Audits (All Agents)
Each agent independently audits their domain:

1. **Use `code_search`** to explore your domain
2. **Use `grep_search`** to find patterns (auth checks, validation, etc.)
3. **Use `read_file`** to verify critical files
4. **Document findings** in your section

### Phase 2: Cross-Domain Verification
1. Check intersections between domains
2. Verify shared components (auth, middleware, database)
3. Confirm consistency across the codebase

### Phase 3: Test Execution
```bash
npm run lint              # Must pass with 0 errors
npm run test -- --run     # Must pass 1102+ tests
npm run build             # Must complete successfully
```

### Phase 4: Documentation Update
Update ALL of these files:
1. `README.md` — Project overview, status badges
2. `AGENT_LOGBOOK.md` — Task log with your findings
3. `AGENT_AUDIT_FINDINGS.md` — Your domain report
4. `PRODUCTION_AUDIT_SUMMARY.md` — Executive summary

## Deliverables

### Each Agent Must Produce:

1. **Domain Audit Report** (add to `AGENT_AUDIT_FINDINGS.md`):
   ```markdown
   ### @agent_name — Domain Audit Report
   
   **Scope**: [What you audited]
   
   **Findings**:
   - ✅ [Working item]
   - ⚠️ [Warning with recommendation]
   - ❌ [Critical issue blocking production]
   
   **Files Checked**:
   - `src/...` — [what you verified]
   
   **Sign-off**: ⬜ Pending | ✅ Ready
   ```

2. **Update `AGENT_LOGBOOK.md`**:
   Append a task log entry with your findings

3. **Update Documentation**:
   Ensure all docs reflect actual implementation

## Critical Issues (Block Production)

If you find ANY of these, flag immediately:
- Unauthenticated API routes exposing data
- Hardcoded credentials or secrets
- Missing authentication on admin/master routes
- SQL injection vulnerabilities
- XSS vulnerabilities
- No rate limiting on public APIs
- Tests failing
- Build failing

## Expected Outcomes

### Success Criteria:
- All 16 agents complete their audits
- Zero critical issues
- All tests passing
- Documentation fully updated
- Consistent code quality across all files

### Deliverable Files:
1. `AGENT_AUDIT_FINDINGS.md` — Comprehensive multi-agent report
2. `AGENT_LOGBOOK.md` — Updated task logs
3. `README.md` — Current project status
4. `PRODUCTION_AUDIT_SUMMARY.md` — Executive summary

## Commands to Run

```bash
# 1. Code quality
npm run lint
npm run format:check

# 2. Testing
npm run test -- --run
npm run test:coverage

# 3. Build verification
npm run build

# 4. Security scan (if available)
npm audit

# 5. Type checking
npx tsc --noEmit
```

## Final Sign-Off Template

Add this to `AGENT_AUDIT_FINDINGS.md`:

```markdown
## Consolidated Sign-Off Status

| Agent | Domain | Critical Issues | Warnings | Status |
|-------|--------|-----------------|----------|--------|
| @frontend_marketplace | Public UI | 0 | 0 | ✅ |
| @frontend_dashboards | Dashboards | 0 | 0 | ✅ |
| @backend_architect | Core Framework | 0 | 0 | ✅ |
| @auth_agent | Auth | 0 | 0 | ✅ |
| @plugin_payments | Payments | 0 | 0 | ✅ |
| @plugin_operations | Operations | 0 | 0 | ✅ |
| @plugin_crm | CRM | 0 | 0 | ✅ |
| @plugin_integrations | Integrations | 0 | 0 | ✅ |
| @db_architect | Database | 0 | 0 | ✅ |
| @devops | Infrastructure | 0 | 0 | ✅ |
| @security | Security | 0 | 0 | ✅ |
| @theme_designer | Theme | 0 | 0 | ✅ |
| @qa | Testing | 0 | 0 | ✅ |
| @ux_designer | UX/Accessibility | 0 | 0 | ✅ |
| @tech_writer | Documentation | 0 | 0 | ✅ |
| @pm | Product | 0 | 0 | ✅ |

**Overall Status**: 🟢 READY FOR PRODUCTION
```

## Response Format

Provide your findings in this structure:

```markdown
## Multi-Agent Audit Results

### Critical Issues Found: [N]
[If any, list them immediately]

### Domain Summary
[Each agent's findings]

### Test Results
```
[Output from npm test]
```

### Documentation Updates
- [List files updated]

### Final Verdict
🟢 READY | 🟡 NEEDS WORK | 🔴 NOT READY
```

---

**Execute this prompt immediately. Dispatch all agents in parallel. Report findings within this conversation.**
