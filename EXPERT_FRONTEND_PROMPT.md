# SinaiCamps — Expert Prompt for Frontend & API Analysis

Use the prompt below to instruct your OpenCode agent to perform a complete, production-ready analysis and refactor of the frontend and setting configuration controllers:

```markdown
# Role & Task
You are the Lead Frontend Architect and Security Engineer for SinaiCamps. Your task is to perform a deep analysis of the application frontend—covering both the main marketplace site and individual tenant storefronts—and revise it to meet production-ready architectural, logical, and security standards. 

Read your safety guidelines (`.opencode/prompts/safety-rules.md`) and utilize the `frontend-feature` skill to guide your checklist.

---

## 1. Core Codebase Directives

### A. Auth-Aware State Presentation (Logical UI)
- **Session-Aware Layouts**: Audit all shared navigation layouts (e.g., `ShopfrontNav.tsx`, `Nav.tsx`, mobile drawers, and footers). Verify that no authentication triggers (like "Sign In" or "Register") are displayed to authenticated users.
- **Dynamic Controls**: If a user session exists, dynamically render user profile details (avatar, name, role indicator) and a direct link to their role-appropriate control center (e.g. `/admin` for master, `/manage/[propertyId]` or `/owner/dashboard` for managers, `/guest` for standard users).
- **Smooth Handoff**: Ensure that login forms redirect users directly to their correct path depending on roles or custom domain configurations.

### B. The Ultimate "Zero Hardcoded Data" Rule
- **Dynamic Configuration**: No page copy, features lists, hero titles, pricing packages, layout schemas, or contact details may remain static.
- **Storefront Customs**: Tenant storefronts must fetch logo URLs, branding colors, properties list, categories, and custom copy dynamically from the tenant database record. Fall back to theme config variables only if database values are empty.
- **Branding Customizer**: Ensure that a settings panel/customizer exists in the owner dashboard allowing managers to modify these details directly from the frontend, dynamically updating the database store.
- **I18n Localization**: Verify that all user-facing text is translated dynamically via `next-intl` configuration files for all supported locales (`en`, `fr`, `es`, `de`, `ar`).

### C. Secure CRUD Backend Alignment
- **Protected Controllers**: For every setting modified in the dashboard, verify there is a corresponding Next.js App Router API route or Hono endpoint.
- **Session & Privilege Middleware**: Every writing action (POST, PUT, DELETE) must validate that the user is logged in and authorized (e.g. role check for `master` or `manager`). 
- **Validation**: Enforce schema validations (e.g., color validation, string lengths, URL patterns) before modifying the database. Return clean JSON error bodies on failure (e.g., 400 for bad payloads, 401/403 for authentication/authorization failures).
- **Tenant Isolation**: Ensure all settings queries and updates are scoped strictly by `site_id` or `tenant_id` to prevent cross-tenant parameter modification exploits.

---

## 2. Production-Grade Technical Standards

### A. Performance & Next.js Best Practices
- **React Server Components (RSC)**: Keep components as Server Components by default to optimize bundle size. Mark client interactions strictly with `'use client'` only when hook states or DOM events are required.
- **Suspense & Loading Indicators**: Implement React `Suspense` with skeleton loaders for dynamic page portions. Always provide UI indicators (e.g. `Loader2` spinners, disabled form inputs, and save buttons) during API submissions.
- **Asset Optimization**: Ensure all image elements leverage `next/image` to prevent layout shifts (CLS) and serve optimized sizes.

### B. Modern Visual Aesthetics
- **Design Tokens**: Enforce high-end glassmorphism, smooth animations, and cohesive dark modes with glowing gradients (e.g., from `slate-950` via `slate-900` to `zinc-950`).
- **Interactive States**: Hover actions on buttons and links must use smooth transition durations (e.g., `transition-all duration-300`) with custom style shifting (e.g. background change, subtle scale-down active click).

---

## 3. Execution Plan

1. **Static Analysis & Scanning**:
   - Scan all route files in `src/app/` to identify hardcoded UI texts, missing translation files, or static array definitions.
   - Search for endpoints handling UI updates and verify that middleware checks are in place.

2. **Database & Schema Updates**:
   - If tables/attributes are missing to store dynamic values, write a safe migration file and update Drizzle/SQLite model files accordingly.

3. **Refactoring Frontend Views**:
   - Update components to bind values directly to database settings.
   - Implement the dashboard customizer form to feed edits to API controllers.

4. **Regressions & Quality Assurance**:
   - Run `npm run test` (Vitest) and `npm run test:e2e` (Playwright) to ensure zero failures.
   - Verify page load responsiveness and confirm all auth states render correct buttons.
```
