# SinaiCamps — OpenCode Developer Guidelines

This file is the primary system prompt instruction manual for OpenCode agents working inside this project. Read this thoroughly before analyzing code or proposing changes.

---

## 1. Project Specifications

| Property | Value |
| --- | --- |
| **Project Name** | SinaiCamps |
| **Developer** | Michael Helmy |
| **Github** | [Michaelhehelmy&#x2F;campops-marketplace](https://github.com/Michaelhehelmy&#x2F;campops-marketplace) |
| **Production URL** | [https:&#x2F;&#x2F;sinaicamps.com](https:&#x2F;&#x2F;sinaicamps.com) |
| **Framework** | Next.js 14 App Router |
| **Language** | TypeScript |
| **Database** | SQLite |
| **Styling** | Tailwind CSS v3 |
| **Unit Test Framework** | Vitest |
| **E2E Test Framework** | Playwright |
| **Package Manager** | npm |

---

## 2. Dynamic Agent Hand-off and Selection

This project defines specific agents configured in `opencode.json`. Refer to their dedicated system prompts for details:
- **@frontend_marketplace**: Marketplace Frontend Agent — public UI, responsive design, translations, PWA
- **@frontend_dashboards**: Dashboards Frontend Agent — manager and admin panels, forms, charts, role-based views
- **@backend_architect**: Core Framework Architect Agent — plugin engine, multi‑tenancy, hooks, context
- **@auth_agent**: Authentication &amp; Authorization Agent — Better Auth, RBAC, session management, middleware guards
- **@plugin_payments**: Transactions &amp; Payments Plugin Agent — Stripe, webhooks, commissions, checkout
- **@plugin_operations**: Operations Plugin Agent — housekeeping, maintenance, roster, POS
- **@plugin_crm**: Guest Experience &amp; CRM Plugin Agent — loyalty, marketing automation, guest journeys
- **@plugin_integrations**: Integrations Plugin Agent — iCal, OTA managers, third-party sync
- **@db_architect**: Database Architect Agent — schema, ORM, migrations, queries, backup
- **@devops**: DevOps &amp; Infrastructure Agent — CI&#x2F;CD, deployment, servers, Docker, PM2
- **@qa**: QA &amp; Test Automation Agent — Playwright, Vitest, load testing, coverage
- **@security**: Security Engineer Agent — audit logs, vulnerabilities, headers, rate limits
- **@theme_designer**: Theme &amp; UI Designer Agent — theme specification, design tokens, visual consistency
- **@tech_writer**: Technical Writer Agent — API docs, developer guides, user guides
- **@pm**: Product Manager (AI) Agent — backlog, user stories, priorities
- **@ux_designer**: UX Designer Agent — wireframes, prototypes, accessibility audits
- **@scrum_master**: Project Manager &amp; Scrum Master Agent — sprints, blockers, timelines

---

## 3. General Implementation Checklist

When solving coding tasks, always structure your execution using this sequence:
1. **Plan**: Run analytical checks and outline files to edit. Use the `sequential-thinking` MCP to structure your execution plan, and leverage `context-mode` and `context7` MCPs for deep codebase context gathering.
2. **Execute**: Modify target files or write new modules. Ensure proper encapsulation and follow the project design system.
3. **Verify**: Run `run-tests` to ensure zero regressions.
4. **Safety Verification**: Ensure no credentials, log directories, or secret tokens are left unstaged.

---

## 4. Persistent Memory and Logbook (`AGENT_LOGBOOK.md`)

This repository contains a file named `AGENT_LOGBOOK.md` in the project root.
- **Rule**: You MUST read `AGENT_LOGBOOK.md` at the start of any work to check for recent changes or warnings left by previous agent sessions.
- **Rule**: You MUST update the logbook when you finish a task, appending a log entry describing:
  - Date
  - Task done
  - Files changed
  - Learned lessons or codebase bugs/gotchas encountered during the task
- **Rule**: If you discover a recurring codebase pattern, database locking issue, styling requirement, or gotcha, document it directly under the "Persistent Learnings & Codebase Gotchas" section in `AGENT_LOGBOOK.md`.
