# SinaiCamps — OpenCode Agent Rules

> **This file is the authoritative system prompt for OpenCode agents working in this repository.**
> Read this completely before writing a single line of code. Do not skip sections.

**Project:** SinaiCamps
**Developer:** Michael Helmy (GitHub: [Michael Helmy](https://github.com/Michaelhehelmy&#x2F;campops-marketplace))
**Production:** https:&#x2F;&#x2F;sinaicamps.com
**AI Environment:** [OpenCode](https://opencode.ai) — configured via `opencode.json`

---

## 1. Project Overview

Multi-tenant hospitality marketplace

### Tech Stack

| Layer          | Technology                                            |
| -------------- | ----------------------------------------------------- |
| Framework      | Next.js 14 App Router                                     |
| Language       | TypeScript                                      |
| Database       | SQLite                                      |
| Styling        | Tailwind CSS v3                                       |
| Unit Testing   | Vitest                                          |
| E2E Testing    | Playwright                                           |
| Package Mgr    | npm                                |

---

## 2. Non-Negotiable Rules

- Always run tests before marking any task complete
- Never commit .env files or API keys
- Always scope DB queries by tenant ID

---

## 3. OpenCode Configuration

This project uses **OpenCode** as the AI coding environment. Configuration is in `opencode.json`.

### MCP Tools (from `opencode.json`)

Standard Model Context Protocol servers are configured for this project. Proactively use them when applicable:
- **filesystem**: Read and write files directly.
- **sqlite** (if applicable): For querying the database `sinaicamps.db`.
- **sequential-thinking**: Break complex multi-step reasoning steps down.
- **playwright** (if E2E is set): Run browser tests and capture screenshots.

---

## 4. Testing Requirements

### Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all unit tests |
| `npm run test:e2e` | Run E2E tests |

---

## 5. Agent Behaviour Rules

1. **Use `sequential-thinking` MCP** for complex multi-step tasks — plan before coding.
2. **Never break passing tests.** If a change causes a test failure, fix it before continuing.
3. **Log clearly.** Use appropriate logging for errors and warnings.
