# Custom Domain Template Serving System

This document outlines the architecture, routing rules, and serving mechanism used to deliver branded tenant template frontends (specifically for high-tier custom domains like `acaciacamp.com`) alongside standard marketplace and subdomain traffic in the CampOps platform.

---

## 1. Routing & Domains Schema

The platform resolves and serves three main categories of traffic on a single Next.js server instance:

| Domain Type | Pattern Example | Plan Tier | Served Interface | Routing Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Central Marketplace** | `sinaicamps.com`, `localhost:3000` | — | Global Marketplace Search & Aggregator | Next.js Page Router (`src/app/[locale]/page.tsx`) |
| **Premium Subdomain** | `safari-camp.sinaicamps.com` | basic / pro | White-labeled booking list details view | Next.js Middleware Rewrite (`/stay/[slug]`) |
| **Ultimate Custom Domain** | `acaciacamp.com` | ultimate | Branded Vite SPA template | Next.js Middleware hijack rewrite to `/api/tenant/serve` |

---

## 2. Dynamic Serving Architecture (SPA Catch-All)

To mimic a production premium host environment (e.g. Cloudflare Pages or standalone static host) while developing locally or deploying onto a single virtual machine:

### A. Middleware Interception (`src/middleware.ts`)
1. Filters out internal Next.js asset paths (`/_next/*`) and standard dynamic backend APIs (`/api/*`).
2. Performs tenant resolution by querying database entries for custom domains.
3. If the host is identified as a verified custom domain, rewrites all remaining frontend paths (assets, roots, pages) to `/api/tenant/serve?host=[host]&path=[pathname]`.

### B. Catch-All Serving Layer (`src/app/api/tenant/serve/route.ts`)
This API handler acts as a proxy/static file router to the compiled Vite SPA:
1. **Directory Path**: Resolves physical files under `builds/[tenant-slug]/dist/`.
2. **SPA Routing**:
   * If a file exists (e.g., `/assets/index-GFB96b6Q.js`), it streams the file with the proper `Content-Type` mime type.
   * If no file exists and the path contains no file extension (representing a frontend client-side route like `/en/login` or `/en/manage/3`), it streams the pre-compiled `index.html`.
3. **Context Injection**:
   For `index.html`, it dynamically replaces the meta placeholder:
   ```html
   <meta id="x-tenant-property-id" name="x-tenant-property-id" content="" />
   ```
   with:
   ```html
   <meta id="x-tenant-property-id" name="x-tenant-property-id" content="[property-id]" />
   ```
   This boot-straps the front-end SPA with the appropriate API property context.

---

## 3. Local Simulation & Testing

To test this locally:
1. Ensure the host is mapped in `/etc/hosts`:
   ```
   127.0.0.1 acaciacamp.com
   ```
2. Run the Next.js application on port 3000:
   ```bash
   npm run dev
   ```
3. Visit `http://acaciacamp.com:3000` to interact with the isolated, branded Acacia Camp shopfront.
