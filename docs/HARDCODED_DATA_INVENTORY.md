# SinaiCamps Hardcoded Data Inventory

This inventory documents all hardcoded credentials, mock URLs, brand names, and static version strings present in the SinaiCamps Marketplace codebase, along with their resolution status for high-security launch readiness.

---

## 1. Hardcoded Credentials & Default Passwords

These credentials are used primarily for seeding local development databases, manual testing, or E2E suites.

| File Path                                                                                                                      | Line Number | Content / Key    | Description / Action                                                      | Resolution Status                                                               |
| :----------------------------------------------------------------------------------------------------------------------------- | :---------- | :--------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------------ | --- | -------------------------------------------------------------------------------------------------------------------- |
| [db.ts](file:///home/michael/Proj/campops-marketplace/src/lib/db.ts)                                                           | 429-430     | `hashedPassword` | Pre-computed scrypt hash for `'password123'` used for initial test users. | **Secured**: Wrapped inside `if (!isProd                                        |     | process.env.SEED_TEST_USERS === 'true')` check to completely block default test users in standard production builds. |
| [auth.fixture.ts](file:///home/michael/Proj/campops-marketplace/e2e/helpers/auth.fixture.ts)                                   | 17          | `'password123'`  | Hardcoded password in authentication helper for Playwright E2E.           | **Preserved**: Essential for developer testing and automated integration flows. |
| [frontend-functionality.spec.ts](file:///home/michael/Proj/campops-marketplace/e2e/tests/audit/frontend-functionality.spec.ts) | 5           | `'password123'`  | Hardcoded test runner password.                                           | **Preserved**: Safe for E2E-only context.                                       |
| [owner.test.ts](file:///home/michael/Proj/campops-marketplace/src/lib/__tests__/owner.test.ts)                                 | 9           | `'password123'`  | Hardcoded unit-test credential.                                           | **Preserved**: Local mock scope only.                                           |

---

## 2. Hardcoded Mock URLs

These URLs point to external payment, CRM, or PWA endpoints and are designed to be environment-configurable.

| File Path                                                                                              | Line Number | Mock URL                   | Description                                               | Resolution Status                                                                                                             |
| :----------------------------------------------------------------------------------------------------- | :---------- | :------------------------- | :-------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| [PluginAPI.ts](file:///home/michael/Proj/campops-marketplace/src/lib/PluginAPI.ts)                     | 180         | `https://mock-payment.com` | Hardcoded default target for the dynamic payment service. | **Resolved**: Replaced with `process.env.PAYMENT_URL \|\| 'https://mock-payment.com'` to allow runtime environment overrides. |
| [PluginAPI.test.ts](file:///home/michael/Proj/campops-marketplace/src/lib/__tests__/PluginAPI.test.ts) | 129         | `https://mock-payment.com` | Expected unit-test assertion target.                      | **Preserved**: Verified by fallback behavior in unit testing.                                                                 |

---

## 3. Hardcoded Brand Names

These static names represent the central marketplace tenant identity and are replaced with tenant-aware branding in isolated shopfront views.

| File Path                                                                                           | Line Number | Brand String                          | Description                          | Resolution Status                                                                                                    |
| :-------------------------------------------------------------------------------------------------- | :---------- | :------------------------------------ | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| [layout.tsx](file:///home/michael/Proj/campops-marketplace/src/app/[locale]/layout.tsx)             | 8           | `'SinaiCamps Marketplace'`            | Title template metadata.             | **Resolved**: Dynamically overridden with the specific property name on tenant subdomains or custom domains.         |
| [layout.tsx](file:///home/michael/Proj/campops-marketplace/src/app/[locale]/layout.tsx)             | 43          | `'© SinaiCamps. All rights reserved'` | Default platform footer copyright.   | **Resolved**: Dynamically swapped to the property's custom copyright text on shopfront views.                        |
| [Nav.tsx](file:///home/michael/Proj/campops-marketplace/src/components/Nav.tsx)                     | 45          | `'SinaiCamps'`                        | Standard navigation header branding. | **Resolved**: Hidden on custom subdomains/custom domains; replaced with `<ShopfrontNav>` showing property logo/name. |
| [guest/layout.tsx](file:///home/michael/Proj/campops-marketplace/src/app/[locale]/guest/layout.tsx) | 22          | `'SinaiCamps'`                        | Guest portal branding.               | **Resolved**: Overridden with property-aware header name.                                                            |

---

## 4. Hardcoded Plugin Versions

Dynamic plugin components are assigned base configurations or standard version identifiers.

| File Path                                                                                                     | Line Number | Version String       | Description                                | Resolution Status                                                                         |
| :------------------------------------------------------------------------------------------------------------ | :---------- | :------------------- | :----------------------------------------- | :---------------------------------------------------------------------------------------- |
| [db.ts](file:///home/michael/Proj/campops-marketplace/src/lib/db.ts)                                          | 396         | `version TEXT`       | Schema column configuration.               | **Standardized**: Defined dynamically from filesystem package manifests where applicable. |
| [plugin-development-guide.md](file:///home/michael/Proj/campops-marketplace/docs/plugin-development-guide.md) | 24          | `"version": "1.0.0"` | Guidelines for plugin package definitions. | **Documented**: Retained as correct boilerplate specifications.                           |
