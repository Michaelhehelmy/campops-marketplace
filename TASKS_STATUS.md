# Production Readiness — Task Status Tracker

**Last updated:** 2026-05-21T16:50:00Z  
**Legend:**

- `[x] Ready` — Task definition is complete, verified, and ready for execution
- `[ ] Not ready` — Task definition is incomplete or needs further review
- `Executed` column shows which tasks have been implemented and verified.

| ID       | Phase                              | Category       | Priority | Description                                                              | Ready | Executed |
| -------- | ---------------------------------- | -------------- | -------- | ------------------------------------------------------------------------ | ----- | -------- |
| PH1-001  | 1 – Launch Blockers                | Security       | CRITICAL | Authenticate all mutating API routes                                     | [x]   | [x]      |
| PH1-002  | 1 – Launch Blockers                | Security       | CRITICAL | Remove hardcoded GitHub PAT from .env                                    | [x]   | [x]      |
| PH1-003  | 1 – Launch Blockers                | Performance    | CRITICAL | Add database indexes for critical query paths                            | [x]   | [x]      |
| PH1-004  | 1 – Launch Blockers                | Reliability    | CRITICAL | Prevent SQLite SQLITE_BUSY under concurrent access                       | [x]   | [x]      |
| PH2-001  | 2 – Security & Reliability         | Payment        | HIGH     | Add idempotency and transactions to payment webhooks                     | [x]   | [x]      |
| PH2-002  | 2 – Security & Reliability         | Plugin System  | HIGH     | Isolate plugin execution — prevent server crashes                        | [x]   | [x]      |
| PH2-003  | 2 – Security & Reliability         | Observability  | HIGH     | Add audit logging to all payment and admin mutating endpoints            | [x]   | [x]      |
| PH2-004  | 2 – Security & Reliability         | Security       | HIGH     | Add input validation to all API routes                                   | [x]   | [x]      |
| PH2-005  | 2 – Security & Reliability         | Security       | HIGH     | Remove localhost from production CSP and CORS config                     | [x]   | [x]      |
| PH2-006  | 2 – Security & Reliability         | Security       | HIGH     | Rate-limit ALL API routes, not just plugin catch-all and public prefixes | [x]   | [x]      |
| PH3-001  | 3 – Performance & Obs              | Observability  | HIGH     | Add structured health checks for all critical services                   | [x]   | [x]      |
| PH3-002  | 3 – Performance & Obs              | Observability  | MEDIUM   | Add request ID propagation and metrics export                            | [x]   | [x]      |
| PH3-003  | 3 – Performance & Obs              | Reliability    | MEDIUM   | Add SQLite WAL mode check in health check and boot script                | [x]   | [x]      |
| PH3-004  | 3 – Performance & Obs              | Observability  | MEDIUM   | Add error tracking service integration                                   | [x]   | [x]      |
| PH4-001  | 4 – DevOps & Deployment            | DevOps         | HIGH     | Implement zero-downtime deployment                                       | [x]   | [x]      |
| PH4-002  | 4 – DevOps & Deployment            | DevOps         | MEDIUM   | Add database migration testing to CI                                     | [x]   | [x]      |
| PH4-003  | 4 – DevOps & Deployment            | DevOps         | MEDIUM   | Configure automated database backups in CI/CD                            | [x]   | [x]      |
| PH5-001  | 5 – Plugin System Hardening        | Plugin System  | MEDIUM   | Add plugin capability/scope system                                       | [x]   | [x]      |
| PH5-002  | 5 – Plugin System Hardening        | Plugin System  | MEDIUM   | Add plugin health check and watchdog                                     | [x]   | [x]      |
| PH6-001  | 6 – Payments Polish                | Payment        | HIGH     | Full Elevate Pay integration or remove                                   | [x]   | [x]      |
| PH6-002  | 6 – Payments Polish                | Payment        | MEDIUM   | Add Stripe checkout success confirmation page                            | [x]   | [x]      |
| PH7-001  | 7 – Testing & E2E Coverage         | Testing        | HIGH     | Write auth-gap E2E tests                                                 | [x]   | [x]      |
| PH7-002  | 7 – Testing & E2E Coverage         | Testing        | MEDIUM   | Add load/stress test plan                                                | [x]   | [x]      |
| PH8-001  | 8 – QA Issue Fixes                 | Security       | CRITICAL | Fix CSRF for unauthenticated API requests                                | [x]   | [x]      |
| PH8-002  | 8 – QA Issue Fixes                 | Booking        | CRITICAL | Implement guest booking flow (login redirect + checkout page)            | [x]   | [x]      |
| PH8-003  | 8 – QA Issue Fixes                 | PWA            | HIGH     | Fix PWA manifest 404 — add rewrite rule                                  | [x]   | [x]      |
| PH8-004  | 8 – QA Issue Fixes                 | i18n           | HIGH     | Create missing translation files (ar, fr, de, es)                        | [x]   | [x]      |
| PH8-005  | 8 – QA Issue Fixes                 | i18n           | HIGH     | Add LanguageSwitcher UI component                                        | [x]   | [x]      |
| PH8-006  | 8 – QA Issue Fixes                 | Homepage       | HIGH     | Seed featured listings and categories data                               | [x]   | [x]      |
| PH8-007  | 8 – QA Issue Fixes                 | Manager UI     | MEDIUM   | Fix finance page stuck loading — create API route                        | [x]   | [x]      |
| PH8-008  | 8 – QA Issue Fixes                 | Manager UI     | MEDIUM   | Fix staff page empty — create API route                                  | [x]   | [x]      |
| PH8-009  | 8 – QA Issue Fixes                 | Plugins        | MEDIUM   | Fix plan display mismatch — return plan from listing-access              | [x]   | [x]      |
| PH8-010  | 8 – QA Issue Fixes                 | Audit          | HIGH     | Add audit logging to master mutation routes                              | [x]   | [x]      |
| PH8-011  | 8 – QA Issue Fixes                 | Dependencies   | MEDIUM   | Install missing deps (ioredis, @sentry/nextjs, nodemailer)               | [x]   | [x]      |
| PH8-012  | 8 – QA Issue Fixes                 | Data           | MEDIUM   | Fix orphaned owner accounts with role + password                         | [x]   | [x]      |
| PH8-013  | 8 – QA Issue Fixes                 | Data           | MEDIUM   | Seed room instances (10 rooms across 3 types)                            | [x]   | [x]      |
| PH9-001  | 9 – Final Polish & QA              | Testing        | HIGH     | Fix test failures from Phase 8 changes (4 → 0)                           | [x]   | [x]      |
| PH9-002  | 9 – Final Polish & QA              | Testing        | MEDIUM   | Update E2E tests for new auth flows                                      | [x]   | [x]      |
| PH9-003  | 9 – Final Polish & QA              | Documentation  | MEDIUM   | Update QA-VERIFICATION-REPORT.md and TASKS_STATUS.md                     | [x]   | [x]      |
| PH10-001 | 10 – Production Hardening          | Infrastructure | MEDIUM   | Fix rate limiter 503→429 and add X-RateLimit headers                     | [x]   | [x]      |
| PH10-002 | 10 – Production Hardening          | Observability  | MEDIUM   | Fix metrics endpoint returning `{}` (Edge/Node runtime split)            | [x]   | [x]      |
| PH10-003 | 10 – Production Hardening          | Observability  | MEDIUM   | Complete audit logging for all mutation routes                           | [x]   | [x]      |
| PH10-004 | 10 – Production Hardening          | Auth           | MEDIUM   | Fix staff session staleness on maintenance pages                         | [x]   | [x]      |
| PH10-005 | 10 – Production Hardening          | UI             | LOW      | Fix React hydration warning in BookingFallback                           | [x]   | [x]      |
| PH11-001 | 11 – E2E Production Verification   | Testing        | CRITICAL | Run full 187 E2E suite and fix all failures                              | [x]   | [x]      |
| PH11-002 | 11 – E2E Production Verification   | Testing        | HIGH     | Add CSRF headers to client-side fetch calls (3 pages)                    | [x]   | [x]      |
| PH11-003 | 11 – E2E Production Verification   | Testing        | HIGH     | Tighten `waitForResponse` filters to prevent false positives             | [x]   | [x]      |
| PH12-001 | 12 – Production Build & Lighthouse | Build          | CRITICAL | Fix production build errors (missing exports, deps, dynamic flags)       | [x]   | [x]      |
| PH12-002 | 12 – Production Build & Lighthouse | A11y           | MEDIUM   | Fix Lighthouse accessibility failures (color contrast, labels, lang)     | [x]   | [x]      |
| PH12-003 | 12 – Production Build & Lighthouse | Testing        | LOW      | Fix regression test in api-client.test.ts (ok + URL assertion)           | [x]   | [x]      |
| PH12-004 | 12 – Production Build & Lighthouse | Documentation  | LOW      | Update QA-VERIFICATION-REPORT.md, AGENTS.md, TASKS_STATUS.md             | [x]   | [x]      |
