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
- **@deploy**: Specializes in local builds, environment packaging, and server deployment.
- **@qa**: Focuses on test coverage execution, visual regression checkouts, and smoke testing.
- **@db**: Responsible for migrations, indexes, schemas, and query optimization.
- **@plugin-dev**: Creates modular features and scaffolds plugins/packages.
- **@frontend**: Designs responsive pages and forms, handles dynamic configurations, ensures auth-aware logical rendering, and creates supporting backend routes/APIs.

---

## 3. General Implementation Checklist

When solving coding tasks, always structure your execution using this sequence:
1. **Plan**: Run analytical checks and outline files to edit. Use `sequential-thinking` MCP to structure your execution plan.
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
