# SinaiCamps Marketplace — Architecture Blueprint

## "WordPress for Rental Marketplaces"

> **Master implementation plan.** Each task has a checkbox. The agent checks them off as
> work is completed and must not start a later phase until the current one is ✅ unless
> explicitly instructed. All design decisions are documented inline with trade-off notes.

---

## Guiding Principles

1. **Core is a thin framework** — it provides routing, auth, the DB abstraction, hooks, and
   the plugin/theme loader. It stores no business data of its own.
2. **Nothing hardcoded** — no field named `price`, `amenities`, or `capacity` may ever
   appear in core or in a theme. All such fields are registered by plugins or declared in
   `theme.json`.
3. **Hooks everywhere** — every important lifecycle event fires an action or filter hook.
   Core processes never call plugin code directly.
4. **Multi-tenant isolation** — every DB query for tenant-owned data is scoped by `site_id`.
5. **Preserve working tests** — existing 665 unit/integration tests and 131 E2E tests must
   continue to pass after each phase.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Browser / Native App                   │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────────────────┐
│  Next.js 14 App Router (core framework)             │
│  ┌──────────────────────────────────────────────┐   │
│  │  middleware.ts  (request lifecycle stage 1)  │   │
│  │   → resolve site (host → site_id)            │   │
│  │   → auth guard                               │   │
│  │   → theme / SPA dispatch                     │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  RequestContext  (site_id, theme, plugins)   │   │
│  └──────────────────────────────────────────────┘   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │  Core API  │  │  Plugin    │  │  Theme     │     │
│  │  routes    │  │  routes    │  │  renderer  │     │
│  │  /api/core │  │  /api/p/  │  │  /api/     │     │
│  │            │  │            │  │  theme/    │     │
│  └────────────┘  └────────────┘  └────────────┘     │
└─────────────────────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   SQLite (dev)     │
         │   PostgreSQL (prod)│
         │                    │
         │  sites             │  ← tenant registry
         │  posts             │  ← universal content
         │  postmeta          │  ← EAV for any field
         │  options           │  ← per-site key/value
         │  users             │  ← shared auth
         │  site_users        │  ← per-site roles
         │  available_plugins │  ← plugin registry
         │  site_plugins      │  ← per-site activations
         │  available_themes  │  ← theme registry
         └────────────────────┘
```

---

## Phase 0 — Pre-Work & Test Harness

> **Goal**: Ensure the project is green and has a migration safety net before any schema
> changes. No new features.

- [ ] **0.1** Run `npm run check:full` and confirm all 665 unit + 131 E2E tests pass.
      Record baseline in `docs/TEST_BASELINE.md`.
- [ ] **0.2** Add a `scripts/db-snapshot.sh` script that dumps the live SQLite DB to
      `backups/YYYYMMDD-pre-migration.db`. Run it.
- [ ] **0.3** Rename the current `BLUEPRINT.md` convention marker in `package.json` scripts:
      add `"blueprint:check": "echo 'Blueprint tracking active'"`.
- [ ] **0.4** Create `tasks.json` at repo root (see Appendix A for schema). Populate it with
      every task in this document. This is the machine-readable progress tracker.
- [ ] **0.5** Confirm `campops.db` has a complete working dataset; document all existing
      table names in `docs/SCHEMA_CURRENT.md`.

---

## Phase 1 — Core Schema: Posts, Postmeta, Options

> **Goal**: Introduce the three universal tables alongside existing tables (zero breakage).
> Existing `properties` table stays untouched; new tables live beside it.

### Design Decision: EAV vs. JSONB

The `postmeta` table uses the classic Entity-Attribute-Value pattern (same as WordPress's
`wp_postmeta`). **Trade-offs:**

| Approach                      | Pros                                                   | Cons                                                                         |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| EAV (`postmeta`)              | Infinitely extensible, no schema migrations per plugin | Queries join heavy; full-text search harder                                  |
| JSONB blob on `posts`         | Single query, native Postgres operators                | Schema-less queries need GIN indexes; harder for plugins to add typed fields |
| Hybrid (EAV + computed JSONB) | Best query perf, still extensible                      | Extra complexity, keep in sync                                               |

**Decision**: Start with pure EAV matching WordPress. In Phase 4 add a `computed_meta` JSONB
column on `posts` for hot fields (price, location). Keep the EAV as the authoritative store.

### Design Decision: `posts` table primary key

Use `TEXT` UUID, not auto-increment integer, to allow distributed inserts and deterministic
seeding. WordPress uses integer IDs but that creates cross-site ID collisions in multisite —
UUID avoids this from day one.

### Tasks

- [ ] **1.1** Create `src/db/migrations/001_core_posts.sql`:

```sql
-- sites: replaces the concept of "tenants" / "properties" as a registry record.
-- The old `properties` table remains for backward-compat; sites is the new abstraction.
CREATE TABLE IF NOT EXISTS sites (
  id          TEXT PRIMARY KEY,          -- UUID
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  domain      TEXT,                      -- custom domain
  subdomain   TEXT,                      -- e.g. "acacia" → acacia.sinaicamps.com
  plan        TEXT NOT NULL DEFAULT 'basic', -- 'basic' | 'premium' | 'ultimate'
  status      TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'pending'
  owner_id    TEXT REFERENCES users(id),
  theme_id    TEXT,                      -- FK → available_themes.id
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  post_type     TEXT NOT NULL,           -- 'listing' | 'page' | plugin-defined
  post_status   TEXT NOT NULL DEFAULT 'draft', -- 'publish' | 'draft' | 'trash'
  post_title    TEXT NOT NULL DEFAULT '',
  post_slug     TEXT NOT NULL DEFAULT '',
  post_content  TEXT,                    -- rich text / markdown
  post_excerpt  TEXT,
  author_id     TEXT REFERENCES users(id),
  parent_id     TEXT REFERENCES posts(id),
  menu_order    INTEGER DEFAULT 0,
  created_at    INTEGER DEFAULT (unixepoch()),
  updated_at    INTEGER DEFAULT (unixepoch()),
  published_at  INTEGER,
  UNIQUE(site_id, post_type, post_slug)
);

CREATE TABLE IF NOT EXISTS postmeta (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  site_id     TEXT NOT NULL,             -- denormalised for fast tenant-scoped queries
  meta_key    TEXT NOT NULL,
  meta_value  TEXT,                      -- stored as string; type-cast in app layer
  UNIQUE(post_id, meta_key)
);

CREATE TABLE IF NOT EXISTS options (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT NOT NULL,
  option_name TEXT NOT NULL,
  option_value TEXT,
  autoload    INTEGER DEFAULT 1,         -- 1 = load with every request (like WordPress)
  UNIQUE(site_id, option_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_site_type    ON posts(site_id, post_type);
CREATE INDEX IF NOT EXISTS idx_posts_site_status  ON posts(site_id, post_status);
CREATE INDEX IF NOT EXISTS idx_posts_site_slug    ON posts(site_id, post_slug);
CREATE INDEX IF NOT EXISTS idx_postmeta_post      ON postmeta(post_id);
CREATE INDEX IF NOT EXISTS idx_postmeta_key_value ON postmeta(meta_key, meta_value);
CREATE INDEX IF NOT EXISTS idx_options_site       ON options(site_id, option_name);
```

- [ ] **1.2** Create `src/db/migrations/002_themes_registry.sql`:

```sql
CREATE TABLE IF NOT EXISTS available_themes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT,
  description  TEXT,
  version      TEXT,
  author       TEXT,
  screenshot   TEXT,                     -- URL to preview image
  manifest     TEXT,                     -- JSON: theme.json contents
  entry_path   TEXT,                     -- relative path inside themes/ dir
  is_active    INTEGER DEFAULT 1,
  created_at   INTEGER DEFAULT (unixepoch())
);
```

- [ ] **1.3** Write a migration runner `src/lib/runMigrations.ts` that:
  - Reads all `*.sql` files from `src/db/migrations/` ordered by filename.
  - Tracks applied migrations in a `schema_migrations` table.
  - Is idempotent (safe to re-run).
  - Exports `runMigrations()` called on app bootstrap in `src/lib/db.ts`.

- [ ] **1.4** Add Drizzle schema symbols in `src/db/schema.ts` for `sites`, `posts`,
      `postmeta`, `options`, `available_themes`. Use `posts` as the symbol (not `listings`) to
      keep generic framing.

- [ ] **1.5** Write unit tests in `src/lib/__tests__/core-schema.test.ts`:
  - Insert a site, a post, two postmeta rows, one option.
  - Assert `UNIQUE(site_id, option_name)` constraint fires correctly.
  - Assert `ON DELETE CASCADE` from site → posts → postmeta.

- [ ] **1.6** Write a one-time data migration script `scripts/migrate-properties-to-sites.ts`
      that copies every row in `properties` into `sites` (mapping `plan` values:
      `subdomain` → `premium`, `custom_domain`/`ultimate` → `ultimate`). Does NOT delete
      the `properties` table. Safe to re-run (upsert on `slug`).

- [ ] **1.7** Run migrations on dev DB. Verify `npm run test:all` still passes.

---

## Phase 2 — PostQuery: The Universal Data Layer

> **Goal**: Build the `PostQuery` class — the equivalent of WordPress's `WP_Query`. Every
> read of content anywhere in the app goes through this, never raw SQL.

### Design Decision: PostQuery API shape

Model it after WP_Query's argument bag, not SQL:

```typescript
const results = await PostQuery.query({
  siteId: 'site-uuid',
  postType: 'listing',
  status: 'publish',
  meta: [
    { key: 'price_per_night', compare: '<=', value: '200' },
    { key: 'category', value: 'camp' },
  ],
  orderBy: 'meta:price_per_night',
  order: 'ASC',
  limit: 20,
  offset: 0,
});
```

This hides the EAV join complexity from all callers.

### Tasks

- [ ] **2.1** Create `src/lib/PostQuery.ts`:
  - Class `PostQuery` with static `query(args: PostQueryArgs): Promise<Post[]>`.
  - Supports: `siteId`, `postType`, `status`, `postSlug`, `authorId`, `parentId`,
    `meta[]` (key/value/compare), `search` (title LIKE), `orderBy`, `order`, `limit`,
    `offset`.
  - `meta` comparisons: `=`, `!=`, `<`, `<=`, `>`, `>=`, `LIKE`, `IN`, `NOT IN`,
    `EXISTS` (key present), `NOT EXISTS`.
  - Always scopes by `site_id`. Never returns posts from another site.
  - Returns `Post[]` where each `Post` includes a `meta: Record<string, string>` map.

- [ ] **2.2** Create `src/lib/PostRepository.ts` — CRUD layer:
  - `createPost(siteId, data): Promise<Post>`
  - `updatePost(siteId, postId, data): Promise<Post>`
  - `deletePost(siteId, postId): Promise<void>` (sets `post_status = 'trash'`)
  - `getMeta(postId, key): Promise<string | null>`
  - `setMeta(postId, siteId, key, value): Promise<void>` — upsert
  - `deleteMeta(postId, key): Promise<void>`
  - `getAllMeta(postId): Promise<Record<string, string>>`

- [ ] **2.3** Create `src/lib/OptionsRepository.ts`:
  - `getOption(siteId, key, defaultValue?): Promise<string | null>`
  - `setOption(siteId, key, value): Promise<void>` — upsert
  - `deleteOption(siteId, key): Promise<void>`
  - `getAutoloadOptions(siteId): Promise<Record<string, string>>` — for request bootstrap

- [ ] **2.4** Write unit tests `src/lib/__tests__/post-query.test.ts`:
  - Query by post type — returns only matching type.
  - Query by meta key/value.
  - Query with `meta.compare = '<='` on numeric string.
  - Cross-site isolation: query for site A never returns site B posts.
  - `getAllMeta` returns complete map.
  - `setMeta` upserts (call twice, same key → one row).

- [ ] **2.5** Write unit tests `src/lib/__tests__/options-repository.test.ts`:
  - Set/get/delete cycle.
  - Default value returned when key missing.
  - Cross-site isolation.

- [ ] **2.6** Verify `npm run test:all` still passes after adding the new tests.

---

## Phase 3 — Hooks Engine Upgrade

> **Goal**: Promote the current Tapable-based `HookManager` to a full WordPress-style
> `do_action` / `apply_filters` dual-track engine with priorities, and make it
> site-scoped so plugins can register handlers only for their tenant.

### Design Decision: Actions vs. Filters

WordPress makes a hard distinction:

- **Actions** — side effects (`do_action`). Return value ignored.
- **Filters** — data transformation (`apply_filters`). Each handler receives and must
  return the value.

The current `HookManager` is filters-only (pipeline). We add an explicit `doAction` path.
**Library**: Keep `plugin-engine` (Tapable wrapper) for the filter waterfall. Add a simple
priority queue for actions. No new dependencies.

### Design Decision: Site-scoped hooks

A plugin activated for site A should only respond to hooks fired for site A. Two options:

1. Include `siteId` in the hook name: `booking:created:site-uuid` — simple but verbose.
2. Include `siteId` in the data payload and let handlers filter themselves — current
   approach; leaks cross-tenant data.
3. Per-site hook registries: each `RequestContext` gets its own `HookManager` instance
   loaded with that site's active plugins.

**Decision**: Option 3. `RequestContext` instantiates a `SiteHookManager` from the global
registry of all plugin init functions, filtered to only those active for the site. Global
hooks (platform-level) continue to use the global `hookManager`.

### Tasks

- [ ] **3.1** Extend `src/lib/hooks.ts`:
  - Add `doAction(name: string, data: any, siteId?: string): Promise<void>` — fires all
    handlers, ignores return values.
  - Add `applyFilters<T>(name: string, value: T, context?: any, siteId?: string): Promise<T>`
    — waterfall, each handler receives and returns the value.
  - Add `priority` parameter to `register()` — lower number = earlier execution (same as
    WordPress: default 10, range 1-99).
  - Keep existing `hookManager.register/execute` as backward-compat shim (maps to
    `applyFilters`).

- [ ] **3.2** Create `src/lib/SiteHookManager.ts`:
  - `class SiteHookManager` wraps the global registry.
  - `SiteHookManager.forSite(siteId)` → returns instance with only hooks registered by
    plugins active for that site.
  - Used by `RequestContext` (Phase 5).

- [ ] **3.3** Add core action hooks — fire these from the relevant code paths:

| Hook name                 | Type   | When                                          |
| ------------------------- | ------ | --------------------------------------------- |
| `core:request:bootstrap`  | action | Start of every middleware run                 |
| `core:site:resolved`      | action | After tenant resolution succeeds              |
| `core:post:before_save`   | filter | Before `PostRepository.createPost/updatePost` |
| `core:post:after_save`    | action | After post saved                              |
| `core:post:before_delete` | filter | Before trash                                  |
| `core:option:get`         | filter | `OptionsRepository.getOption` return value    |
| `core:option:set`         | action | After option saved                            |
| `core:theme:loaded`       | action | After theme manifest parsed                   |

- [ ] **3.4** Update `PluginAPI.ts` to expose `doAction` and `applyFilters` at the top level
      alongside the existing `hooks.*` API. Mark `hooks.execute` as deprecated.

- [ ] **3.5** Write unit tests `src/lib/__tests__/hooks-engine.test.ts`:
  - `doAction` fires all handlers; return value not propagated.
  - `applyFilters` pipeline: three handlers, value transforms through each.
  - Priority ordering: handler at priority 5 fires before priority 10.
  - Site-scoped: handler registered for site A does not fire for site B.

- [ ] **3.6** Verify all existing hook tests still pass. Run `npm run test:all`.

---

## Phase 4 — Theme System

> **Goal**: Define the theme contract, implement a theme loader that reads `theme.json`,
> and serve theme assets dynamically (no rebuild per tenant).

### Design Decision: Theme rendering strategy

Two approaches for serving the shopfront:

| Option                                       | Description                                                                    | Pros                           | Cons                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------- |
| **A: Static Vite build per theme** (current) | Each theme is a pre-built SPA                                                  | Fast CDN delivery              | Rebuild needed; not truly dynamic                       |
| **B: Server-rendered theme**                 | Theme is a Next.js page tree                                                   | Fully dynamic, SSR, no rebuild | More complex; themes need to follow Next.js conventions |
| **C: Hybrid**                                | Theme is a React component tree loaded at runtime via remote module federation | Zero rebuild, dynamic          | Complex bundling; security implications                 |

**Decision**: **Option B** for Phase 4 — themes become a Next.js "theme page tree" mounted
under the tenant's domain. A theme is a folder in `themes/` with React components following
a strict file naming contract. This enables full SSR, no rebuild on branding changes, and
keeps all rendering inside one process. Option C (module federation) is a Phase 8 stretch
goal.

### Theme Contract (`theme.json`)

```jsonc
{
  "id": "camp-classic",
  "name": "Camp Classic",
  "version": "1.0.0",
  "author": "CampOps",
  "description": "Classic campsite shopfront with booking widget",
  "supports": {
    "post_types": ["listing"], // Which post types this theme knows how to display
    "features": ["dark-mode", "pwa"], // Optional feature flags
  },
  "entry": "index.tsx", // Theme root component
  "template_hierarchy": {
    "listing": "templates/single-listing.tsx",
    "archive": "templates/archive.tsx",
    "page": "templates/page.tsx",
    "404": "templates/not-found.tsx",
  },
  "widget_areas": [
    { "id": "sidebar", "label": "Sidebar" },
    { "id": "footer", "label": "Footer" },
  ],
  "custom_fields": [
    // Fields this theme knows how to render (plugins can add more via hooks)
    { "key": "hero_image", "type": "image", "label": "Hero Image" },
    { "key": "short_description", "type": "text", "label": "Tagline" },
  ],
  "plugin_dependencies": [], // Plugins that must be active for full theme function
}
```

### Template Hierarchy (like WordPress)

For a request to a listing `GET /acacia-camp`:

```
themes/<theme>/templates/single-listing.tsx   ← most specific
themes/<theme>/templates/single.tsx
themes/<theme>/templates/index.tsx            ← fallback
```

For the archive (listing index):

```
themes/<theme>/templates/archive-listing.tsx
themes/<theme>/templates/archive.tsx
themes/<theme>/templates/index.tsx
```

### Tasks

- [ ] **4.1** Create `themes/camp-classic/` as the first theme, refactored from
      `templates/shop-frontend/`. This is a **structural rename + contract enforcement**:
  - Copy `templates/shop-frontend/src` → `themes/camp-classic/src`.
  - Add `themes/camp-classic/theme.json` (filled per the contract above).
  - Remove all hardcoded field names (`price_per_night`, `amenities`, etc.) from theme
    components. Replace with `useMeta(postId, key)` hook calls.
  - Theme must compile independently with `tsc --noEmit` in its own tsconfig.

- [ ] **4.2** Create `src/lib/ThemeLoader.ts`:
  - `ThemeLoader.load(themeId: string): Promise<ThemeManifest>` — reads `theme.json`
    from `themes/<themeId>/`.
  - `ThemeLoader.resolveTemplate(themeId, postType, context): string` — implements the
    template hierarchy lookup, returns the resolved file path.
  - `ThemeLoader.getWidgetAreas(themeId): WidgetArea[]`.
  - `ThemeLoader.getCustomFields(themeId): CustomFieldDef[]`.
  - Fires `core:theme:loaded` action after successful load.

- [ ] **4.3** Create `src/lib/ThemeRegistry.ts`:
  - Reads all directories under `themes/` on startup.
  - Registers each valid theme (has `theme.json`) into the `available_themes` DB table.
  - `ThemeRegistry.getForSite(siteId): Promise<ThemeManifest>` — reads `sites.theme_id`,
    falls back to default theme.
  - `ThemeRegistry.activate(siteId, themeId): Promise<void>` — sets `sites.theme_id`,
    saves previous theme ID to options as `previous_theme`.

- [ ] **4.4** Create `src/hooks/useMeta.ts` (React hook for theme components):
  - `useMeta(postId: string, key: string): string | null` — client-side, reads from
    the `postmeta` API.
  - `useAllMeta(postId: string): Record<string, string>` — returns full meta map.
  - Used by theme templates instead of hardcoded fields.

- [ ] **4.5** Create `src/app/api/theme/route.ts`:
  - `GET /api/theme?siteId=` → returns `ThemeManifest` for the site.
  - `GET /api/theme/templates?siteId=&postType=&context=` → returns resolved template
    path.

- [ ] **4.6** Update `src/app/api/tenant/serve/route.ts` to use `ThemeLoader` instead of
      hardcoded `builds/<slug>/dist/` path. For `ultimate` plan sites it still serves the
      pre-built SPA from `builds/` as a fallback if theme is `shop-frontend` (backward-compat).

- [ ] **4.7** Add theme picker to the registration wizard step 2 (`list-your-camp/branding`):
  - Fetch available themes from `GET /api/themes`.
  - Render screenshot thumbnails.
  - Store selected `theme_id` in `sessionStorage` alongside branding data.
  - Pass `theme_id` to `POST /api/owner/register` → saved on the new site record.

- [ ] **4.8** Create `src/app/api/themes/route.ts`:
  - `GET /api/themes` → list all active themes with name, description, screenshot.

- [ ] **4.9** Write unit tests `src/lib/__tests__/theme-loader.test.ts`:
  - Template hierarchy resolves most specific to least specific.
  - Missing template falls back correctly.
  - `getCustomFields` returns merged array from `theme.json`.

- [ ] **4.10** Write E2E test: visit a tenant subdomain → receives HTML served by the
      correct theme template (assert title or a theme-specific `data-theme` attribute).

---

## Phase 5 — Request Context & Site Bootstrap

> **Goal**: Introduce a `RequestContext` object that every API route and server component
> receives, analogous to WordPress's global `$wp` + `$wpdb`. It carries `siteId`,
> `themeManifest`, `activePlugins`, `autoloadOptions`, and the site-scoped hook manager.

### Design Decision: How to pass RequestContext through Next.js App Router

Options:

1. `AsyncLocalStorage` (Node.js) — set at middleware, read anywhere in the request.
2. Pass as a React context from layout.tsx via server-side fetch.
3. Re-derive from headers in each route (current implicit approach).

**Decision**: Option 1 for server-side code (`AsyncLocalStorage`) + Option 2 for client
components (serialise non-sensitive context into a `<script>` tag or server component prop).
This mirrors how Next.js's own `headers()` / `cookies()` work.

### Tasks

- [ ] **5.1** Create `src/lib/RequestContext.ts`:

```typescript
export interface RequestContext {
  siteId: string | null;
  site: SiteRecord | null;
  theme: ThemeManifest | null;
  activePlugins: string[];
  autoloadOptions: Record<string, string>;
  hooks: SiteHookManager;
  isMainDomain: boolean;
  plan: 'basic' | 'premium' | 'ultimate';
}
```

- `RequestContext.bootstrap(siteId: string): Promise<RequestContext>` — loads site
  record, theme, active plugins, autoload options in parallel.
- Stored in `AsyncLocalStorage` during a request.
- `RequestContext.current(): RequestContext | null` — reads from `AsyncLocalStorage`.

- [ ] **5.2** Update `src/middleware.ts`:
  - After tenant resolution, call `RequestContext.bootstrap(siteId)` and store in
    `AsyncLocalStorage`.
  - Serialise safe fields (`siteId`, `plan`, `themeId`) as request headers for client
    components.
  - Fire `core:request:bootstrap` and `core:site:resolved` actions.

- [ ] **5.3** Create `src/lib/SiteBootstrap.ts`:
  - `SiteBootstrap.loadActivePlugins(siteId): Promise<string[]>` — reads
    `property_plugins` (existing table, backward-compat) filtered to `is_enabled = true`.
  - `SiteBootstrap.loadAutoloadOptions(siteId): Promise<Record<string, string>>` — reads
    `options` table where `autoload = 1`.
  - Called by `RequestContext.bootstrap`.

- [ ] **5.4** Expose `RequestContext.current()` inside API routes via a helper:
  - `src/lib/getContext.ts` — thin wrapper that calls `RequestContext.current()` and
    throws a typed error if called outside a request (never in tests without mocking).

- [ ] **5.5** Write unit tests `src/lib/__tests__/request-context.test.ts`:
  - Bootstrap returns correct site, theme, plugins.
  - `current()` returns null when called outside `AsyncLocalStorage` scope.
  - Two concurrent bootstraps (different sites) do not bleed data.

---

## Phase 6 — Plugin System Upgrade

> **Goal**: Make plugins first-class citizens — external zip packages, per-tenant
> activation, version manifests, and a marketplace UI for discovery.

### Design Decision: Plugin loading strategy

| Strategy                               | Security                     | DX                         |
| -------------------------------------- | ---------------------------- | -------------------------- |
| Dynamic `require()` at runtime         | Low isolation (same process) | Simple, fast               |
| Worker threads (Node `worker_threads`) | Process isolation            | Complex, IPC overhead      |
| VM sandboxing (`node:vm`)              | Moderate isolation           | Code must be pre-compiled  |
| Sub-process + JSON RPC                 | Strong isolation             | Heavy per-request overhead |

**Decision**: Keep **in-process dynamic import** for Phase 6. Document this as a known
security boundary (plugins are admin-reviewed before installation). Add a Phase 8 milestone
to evaluate worker thread sandboxing. This matches how WordPress handles plugins (shared
PHP process).

### Plugin Manifest (`plugin.json`)

```jsonc
{
  "id": "booking",
  "name": "Booking Engine",
  "version": "2.0.0",
  "campops_version": ">=2.0.0", // semver range for core compatibility
  "description": "Adds reservation, room types, and payment processing",
  "author": "CampOps Official",
  "entry": "src/index.ts",
  "hooks": ["core:post:after_save", "core:request:bootstrap"],
  "post_types": [
    // Custom post types this plugin registers
    {
      "id": "room_type",
      "label": "Room Types",
      "meta_fields": [
        { "key": "capacity", "type": "number", "label": "Max Guests" },
        { "key": "price_night", "type": "currency", "label": "Price/Night" },
        {
          "key": "bed_type",
          "type": "select",
          "label": "Bed Type",
          "options": ["single", "double", "twin", "king"],
        },
      ],
    },
  ],
  "ui_slots": ["dashboard.bookings-widget", "listing.booking-form"],
  "routes": ["/bookings", "/availability"],
  "permissions": ["read:posts", "write:posts", "read:options"],
  "plan_requirement": "premium", // 'basic' | 'premium' | 'ultimate'
}
```

### Tasks

- [ ] **6.1** Extend `available_plugins` table (migration `003_plugins_v2.sql`):

  ```sql
  ALTER TABLE available_plugins ADD COLUMN campops_version TEXT;
  ALTER TABLE available_plugins ADD COLUMN post_types TEXT; -- JSON array
  ALTER TABLE available_plugins ADD COLUMN plan_requirement TEXT DEFAULT 'basic';
  ALTER TABLE available_plugins ADD COLUMN zip_url TEXT;    -- for external plugins
  ALTER TABLE available_plugins ADD COLUMN review_status TEXT DEFAULT 'approved';
  ```

- [ ] **6.2** Extend `property_plugins` / `tenantPlugins` (migration `004_site_plugins.sql`):

  ```sql
  ALTER TABLE property_plugins ADD COLUMN activated_at INTEGER;
  ALTER TABLE property_plugins ADD COLUMN activated_by TEXT;
  ALTER TABLE property_plugins ADD COLUMN version TEXT;
  ```

- [ ] **6.3** Create `src/lib/PluginLoader.ts`:
  - `PluginLoader.init(siteId: string): Promise<void>` — loads all active plugins for
    the site, calls each plugin's `init(api)` function, stores cleanup callbacks.
  - `PluginLoader.activate(siteId, pluginId): Promise<void>` — calls plugin `onActivate`
    hook, updates DB.
  - `PluginLoader.deactivate(siteId, pluginId): Promise<void>` — calls `onDeactivate`,
    updates DB.
  - Respects `plan_requirement`: throws if site plan is below plugin requirement.

- [ ] **6.4** Update `PluginAPI.ts`:
  - Pass the current `RequestContext` into `makePluginAPI` so plugins can call
    `api.context.siteId`, `api.context.postQuery`, etc.
  - Add `api.registerPostType(definition)` — registers a post type with its meta field
    definitions; stored in options as `registered_post_types`.
  - `api.registerPostType` fires `core:post_type:registered` action.

- [ ] **6.5** Create `src/app/api/plugins/store/route.ts`:
  - `GET /api/plugins/store?siteId=` — returns all `available_plugins` where
    `review_status = 'approved'` and `plan_requirement <= site.plan`.
  - `POST /api/plugins/store/install` — activates a plugin for a site (calls
    `PluginLoader.activate`).

- [ ] **6.6** Build a minimal Plugin Store UI in `src/app/[locale]/manage/[listingId]/plugins/page.tsx`:
  - Fetches available plugins from the store endpoint.
  - Shows installed vs available.
  - Install/Uninstall buttons.
  - Shows `plan_requirement` badge (locks if site plan is insufficient).
  - Filters by category.

- [ ] **6.7** Enforce plan-based plugin access in `PluginLoader.activate` — throw a typed
      `PlanRequirementError` if `site.plan` < `plugin.plan_requirement`.

- [ ] **6.8** Write unit tests `src/lib/__tests__/plugin-loader.test.ts`:
  - Activate a plugin → `onActivate` hook fires.
  - Deactivate → `onDeactivate` fires, plugin routes unregistered.
  - Plan enforcement: basic site cannot install premium plugin.
  - Two sites can activate the same plugin independently without state bleed.

- [ ] **6.9** Verify all existing plugin tests still pass.

---

## Phase 7 — Normalised Tier System & Upgrade Flow

> **Goal**: Normalise plan names to `basic` / `premium` / `ultimate` everywhere and
> implement the upgrade flow (including automatic subdomain/domain provisioning).

### Design Decision: Plan enforcement location

Enforce plan limits in three places:

1. `PluginLoader.activate` (already in Phase 6).
2. `SiteBootstrap.loadActivePlugins` — skip plugins above site plan when loading.
3. Middleware — keep existing route-blocking for basic plan.

Do **not** enforce in the DB (no CHECK constraint on plan column) — easier to adjust
business rules without schema migrations.

### Tasks

- [ ] **7.1** Migration `005_normalise_plans.sql`:

  ```sql
  UPDATE properties SET plan = 'premium'  WHERE plan = 'subdomain';
  UPDATE properties SET plan = 'ultimate' WHERE plan = 'custom_domain';
  UPDATE sites       SET plan = 'premium'  WHERE plan = 'subdomain';
  UPDATE sites       SET plan = 'ultimate' WHERE plan = 'custom_domain';
  ```

- [ ] **7.2** Update all code that compares `plan === 'subdomain'` or
      `plan === 'custom_domain'` to use the new names. Run grep:
      `grep -r "subdomain\|custom_domain" src/ --include="*.ts" --include="*.tsx"`.
      Files to update: `middleware.ts`, `auth/redirect-check/route.ts`,
      `owner/register/route.ts`, `list-your-camp/plan/page.tsx`, `tenant/serve/route.ts`.

- [ ] **7.3** Add `src/lib/PlanGate.ts`:
  - `PlanGate.check(site: SiteRecord, requiredPlan: Plan): boolean`.
  - `PlanGate.canUsePlugin(site, plugin): boolean`.
  - `PlanGate.canUseTheme(site, theme): boolean`.
  - `Plan` type: `'basic' | 'premium' | 'ultimate'`.
  - Ordered: basic < premium < ultimate.

- [ ] **7.4** Create `src/app/api/owner/upgrade/route.ts`:
  - `POST /api/owner/upgrade` — body: `{ siteId, newPlan, subdomain?, customDomain? }`.
  - Validates plan transition (can only upgrade, not downgrade via this endpoint).
  - For `premium`: provisions `subdomain` field, sets `plan = 'premium'`.
  - For `ultimate`: sets `custom_domain`, marks `domain_verified = false`, queues SSL
    check (via a scheduled job placeholder).
  - Fires `core:site:plan_upgraded` action with `{ siteId, oldPlan, newPlan }`.
  - **Does not** trigger SPA build (that's a hook listener's job — see Phase 8).

- [ ] **7.5** Build upgrade UI in `src/app/[locale]/owner/property/page.tsx` (existing file):
  - Show current plan badge.
  - "Upgrade to Premium" / "Upgrade to Ultimate" buttons.
  - Premium: shows subdomain field.
  - Ultimate: shows custom domain field + CNAME instructions.
  - Calls `POST /api/owner/upgrade`.

- [ ] **7.6** Update the registration wizard plan page to use `basic` / `premium` /
      `ultimate` as plan ID values (remove `subdomain` and `custom_domain` IDs).

- [ ] **7.7** Write unit tests `src/lib/__tests__/plan-gate.test.ts`:
  - `check(basicSite, 'premium')` → false.
  - `check(ultimateSite, 'basic')` → true.
  - Plugin with `plan_requirement: 'ultimate'` blocked for premium site.

---

## Phase 8 — Dynamic Build & Zero-Rebuild Branding

> **Goal**: Eliminate the need to rebuild the SPA when branding changes. Move branding from
> build-time env vars to 100% runtime API. Keep the build pipeline as an optional CDN
> optimisation.

### Design Decision: CSS Variables vs. full rebuild

Branding changes that can be applied without rebuild:

- Colors → CSS custom properties (`--color-primary`, etc.) injected via `<style>` tag.
- Fonts → Google Fonts URL swap in `<link>` tag.
- Logos/images → served via `GET /api/media/<siteId>/<key>` redirect.

Branding changes that currently require rebuild:

- PWA manifest (name, theme_color) — solvable: serve manifest dynamically from
  `GET /api/manifest.webmanifest?siteId=`.
- Social meta tags (og:image, og:title) — solvable: SSR the `<head>` dynamically.

**Decision**: Move PWA manifest and `<head>` to dynamic API responses. Mark `build-shop.sh`
as an optional CDN acceleration step, not a requirement.

### Tasks

- [ ] **8.1** Create `src/app/api/manifest.webmanifest/route.ts`:
  - `GET /manifest.webmanifest?siteId=` — returns a dynamic JSON manifest built from
    the site's branding options.
  - Hooked: `applyFilters('core:manifest:build', manifest, { siteId })` so plugins can
    add shortcuts or icons.

- [ ] **8.2** Update `src/app/api/tenant/serve/route.ts` to inject a `<style>` block into
      the served `index.html` with CSS variables from the site's branding options:

  ```html
  <style>
    :root {
      --color-primary: {{primary}};
      --color-accent: {{accent}};
      --font-heading: "{{headingFont}}", sans-serif;
    }
  </style>
  ```

  No rebuild needed for color/font changes.

- [ ] **8.3** Create `src/app/api/media/[siteId]/[key]/route.ts`:
  - Redirects to the media URL stored in `options(siteId, 'media:<key>')`.
  - Used for `logo`, `hero_image`, `favicon` — theme uses these opaque URLs.

- [ ] **8.4** Register a hook listener on `core:site:plan_upgraded` (in
      `src/lib/listeners/buildListener.ts`) that:
  - For `ultimate` plan upgrades: logs a `BUILD_REQUIRED` event to a `build_queue` table
    (created in this phase).
  - Does not call `build-shop.sh` directly — that is triggered by a separate worker or
    CI webhook.

- [ ] **8.5** Create `build_queue` table migration `006_build_queue.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS build_queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id    TEXT NOT NULL,
    status     TEXT DEFAULT 'pending',   -- 'pending' | 'building' | 'done' | 'failed'
    triggered_by TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    started_at INTEGER,
    finished_at INTEGER,
    error      TEXT
  );
  ```

- [ ] **8.6** Create `src/app/api/admin/build-queue/route.ts`:
  - `GET` — master admin only; lists queue.
  - `POST` — trigger a build for a site (writes to `build_queue`).

- [ ] **8.7** Update `BrandingContext.tsx` in `themes/camp-classic` to fetch branding from
      `GET /api/branding?siteId=` (new param) and remove all `VITE_*` fallbacks except as
      last resort.

- [ ] **8.8** Write tests for `core:manifest:build` filter hook and the CSS injection logic.

---

## Phase 9 — Central Marketplace Aggregation

> **Goal**: The main `sinaicamps.com` homepage and search queries posts across all `basic`+
> sites using `PostQuery` with no `siteId` filter (or a list of all site IDs).

### Design Decision: Cross-site PostQuery

WordPress Multisite has a `switch_to_blog()` pattern that queries one site at a time.
A marketplace needs global queries. Two approaches:

1. `PostQuery` without `siteId` filter → single DB query across all sites (works because
   all posts are in one `posts` table, scoped by `site_id` column).
2. Per-site queries merged in application code (fan-out).

**Decision**: Option 1. The `posts` table contains all tenant posts; a global query just
omits the `WHERE site_id = ?` clause. Add `site_id` to the result set so results can be
decorated with tenant branding.

### Tasks

- [ ] **9.1** Add `PostQuery.globalQuery(args: Omit<PostQueryArgs, 'siteId'>)` — queries
      across all active sites. Always requires `postType` to prevent runaway queries.
      Applies `applyFilters('core:global_query:args', args)` before executing.

- [ ] **9.2** Refactor `src/app/api/public/featured-listings/route.ts` to use
      `PostQuery.globalQuery({ postType: 'listing', status: 'publish', ... })` instead of
      raw SQL against `properties`.

- [ ] **9.3** Refactor `src/app/api/public/search/route.ts` similarly.

- [ ] **9.4** Refactor `src/app/[locale]/page.tsx` — the `FeaturedListings` component
      should receive data from `PostQuery.globalQuery` (pass as server component prop).

- [ ] **9.5** Create `src/app/api/public/listings/route.ts` as the canonical public
      listings endpoint (replacing `featured-listings` and old `properties` endpoints):
  - `GET /api/public/listings?type=listing&status=publish&limit=20&meta[price_max]=200`
  - Supports meta filters (URL-encoded PostQueryArgs.meta array).
  - Fires `applyFilters('core:public_listings:query', args)`.

- [ ] **9.6** Basic-tier listing detail page (`/stay/<slug>`) should load data from
      `PostQuery` (by `site.slug` → `siteId` → `PostQuery.query({ siteId, postType: 'listing',
post_slug: slug })`).

- [ ] **9.7** Write integration tests for cross-site isolation in global queries:
  - Global query returns posts from all sites.
  - A site-scoped query never returns posts from other sites.

---

## Phase 10 — Admin Dashboard (Per-Tenant, Plugin-Extensible)

> **Goal**: The `/manage/<siteId>/` dashboard is generated from the plugin registry, not
> hardcoded. Every nav item, widget, and settings tab is contributed by active plugins.

### Tasks

- [ ] **10.1** Refactor `src/app/[locale]/manage/[listingId]/layout.tsx`:
  - Remove the hardcoded Lucide icon list and nav links.
  - Replace with `GET /api/plugins/ui-registry?siteId=` which returns `menuItems[]`
    contributed by active plugins (already partially implemented — expand it).
  - Render nav items dynamically from the registry response.

- [ ] **10.2** Create a generic `DashboardPage` component that:
  - Reads `PluginShell` slots for `dashboard.top`, `dashboard.main`, `dashboard.sidebar`.
  - Renders plugin-registered widgets in those slots.
  - Falls back to an empty state UI if no plugins are active.

- [ ] **10.3** Create `src/app/[locale]/manage/[listingId]/posts/[postType]/page.tsx`:
  - Generic list page for any post type registered by a plugin.
  - Fetches posts via `GET /api/site/posts?siteId=&postType=`.
  - Renders each post's title, status, and a link to edit.
  - "New Post" button links to the editor (Phase 10.4).

- [ ] **10.4** Create `src/app/[locale]/manage/[listingId]/posts/[postType]/[postId]/page.tsx`:
  - Generic post editor.
  - Loads post + all meta via `PostRepository.getAllMeta`.
  - Renders a form field for each registered meta field definition (from plugin
    `registerPostType` manifest + theme `custom_fields`).
  - `applyFilters('core:post_editor:fields', fields, { siteId, postType })` so plugins
    can add/remove/reorder fields.
  - Save calls `PUT /api/site/posts/[postId]`.

- [ ] **10.5** Create `src/app/api/site/posts/route.ts`:
  - `GET /api/site/posts?siteId=&postType=&status=` → `PostQuery.query(...)`.
  - `POST /api/site/posts` → `PostRepository.createPost(...)` + fires
    `core:post:after_save`.

- [ ] **10.6** Create `src/app/api/site/posts/[postId]/route.ts`:
  - `GET` → post + all meta.
  - `PUT` → update post + upsert meta keys (individual fields in request body).
  - `DELETE` → trash.

- [ ] **10.7** Create `src/app/api/site/options/route.ts`:
  - `GET /api/site/options?siteId=&keys[]=branding&keys[]=active_plugins`
  - `PUT /api/site/options` → batch upsert options.

- [ ] **10.8** Write E2E tests:
  - Log in as site owner → `/manage/<siteId>` shows dashboard.
  - Create a post of a plugin-registered type → appears in list.
  - Edit post → save a meta field → value persists on reload.

---

## Phase 11 — External Plugin Submission & Review

> **Goal**: Allow third-party developers to submit plugins; master admins review and
> approve them; approved plugins appear in each site's Plugin Store.

### Tasks

- [ ] **11.1** Migration `007_plugin_submissions.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS plugin_submissions (
    id           TEXT PRIMARY KEY,
    plugin_id    TEXT NOT NULL,
    submitted_by TEXT NOT NULL REFERENCES users(id),
    version      TEXT NOT NULL,
    zip_url      TEXT,
    manifest     TEXT,
    review_notes TEXT,
    status       TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    reviewed_by  TEXT REFERENCES users(id),
    submitted_at INTEGER DEFAULT (unixepoch()),
    reviewed_at  INTEGER
  );
  ```

- [ ] **11.2** Create `src/app/api/plugins/submit/route.ts`:
  - `POST /api/plugins/submit` — authenticated; accepts `{ pluginId, version, manifest,
zipUrl }`. Inserts into `plugin_submissions`. Fires `core:plugin:submitted` action.

- [ ] **11.3** Create `src/app/api/admin/plugins/submissions/route.ts` (master admin only):
  - `GET` — list pending submissions.
  - `PATCH /api/admin/plugins/submissions/[id]` — approve or reject with review notes.
  - On approval: upserts into `available_plugins` with `review_status = 'approved'`.

- [ ] **11.4** Build submission review UI at `src/app/[locale]/admin/plugins/page.tsx`.

- [ ] **11.5** Write unit tests for submission state machine (pending → approved/rejected).

---

## Phase 12 — Production Hardening

> **Goal**: Security, performance, and observability before public launch.

### Tasks

- [ ] **12.1** **Auth enforcement on manage routes**: Add server-side auth check to every
      `src/app/api/site/*` and `src/app/api/manage/*` route (referenced in the pre-existing
      security audit as a High risk finding). Verify with `GET /api/site/posts` without a
      session returns 401.

- [ ] **12.2** **CORS headers**: Add CORS policy to `manage/` and `master/` API routes
      (Medium risk finding). Use `next.config.mjs` headers or a middleware layer.

- [ ] **12.3** **Rate limiting**: Extend `apiRateLimiter` from `/api/p/*` to cover
      `/api/site/*` and `/api/public/*` endpoints.

- [ ] **12.4** **PostQuery injection prevention**: All PostQueryArgs values are passed as
      SQLite bound parameters, never string-interpolated. Add a fuzz test.

- [ ] **12.5** **Plugin sandbox review**: Audit existing 18 plugins for any `db.execute`
      calls that do not respect `site_id` scoping. Document findings.

- [ ] **12.6** **Indexes**: Profile the three most common queries against `posts` +
      `postmeta`. Add composite indexes if needed (e.g., `(site_id, post_type, post_status)`).

- [ ] **12.7** **Migration rollback scripts**: For each migration `00N_*.sql`, create a
      corresponding `00N_*.rollback.sql`.

- [ ] **12.8** **PostgreSQL compatibility**: Test all new migrations and queries against
      PostgreSQL (the production target per `schema.sql` comments). Fix any SQLite-isms
      (`unixepoch()` → `EXTRACT(EPOCH FROM NOW())`, etc.).

- [ ] **12.9** Update `docs/TEST_COVERAGE_REPORT.md` with new coverage baseline.

- [ ] **12.10** Run `npm run check:full` — all checks green.

---

## Appendix A — `tasks.json` Schema

The file `tasks.json` at repo root tracks machine-readable progress. Create it in Phase 0.

```jsonc
{
  "version": "1.0",
  "project": "campops-marketplace-blueprint",
  "phases": [
    {
      "id": "phase-0",
      "name": "Pre-Work & Test Harness",
      "status": "pending", // "pending" | "in_progress" | "complete"
      "tasks": [
        {
          "id": "0.1",
          "description": "Run npm run check:full and record baseline",
          "status": "pending", // "pending" | "in_progress" | "complete" | "blocked"
          "blocked_by": [], // task IDs
          "files_changed": [], // filled in by agent on completion
        },
        // ... one entry per task in this document
      ],
    },
  ],
}
```

---

## Appendix B — Design Decisions Summary

| #   | Decision                       | Choice                                              | Rationale                                                          |
| --- | ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------ |
| B1  | EAV vs JSONB for postmeta      | EAV                                                 | Matches WordPress; infinitely extensible without schema migrations |
| B2  | Post primary key type          | TEXT UUID                                           | Avoids cross-site ID collisions in multisite                       |
| B3  | RequestContext delivery        | `AsyncLocalStorage`                                 | Mirrors Next.js internals; no prop drilling                        |
| B4  | Actions vs Filters distinction | Both tracks                                         | Actions for side-effects; Filters for transformation               |
| B5  | Site-scoped hooks              | Per-site `SiteHookManager` instance                 | Prevents cross-tenant hook bleed                                   |
| B6  | Plugin isolation               | In-process dynamic import                           | Simpler; plugins are admin-reviewed                                |
| B7  | Theme rendering                | Next.js SSR page tree (Option B)                    | No rebuild; full SSR; single process                               |
| B8  | Cross-site queries             | Single `posts` table, no `siteId` filter for global | One SQL query; works because table is already multi-tenant         |
| B9  | Plan enforcement               | Application layer only (no DB CHECK)                | Business rules change without migrations                           |
| B10 | Zero-rebuild branding          | CSS variables + dynamic manifest API                | Colors/fonts change instantly; images via redirect                 |

---

## Appendix C — File Map (New Files per Phase)

```
Phase 1:
  src/db/migrations/001_core_posts.sql
  src/db/migrations/002_themes_registry.sql
  src/lib/runMigrations.ts
  src/db/schema.ts                         (updated)
  scripts/migrate-properties-to-sites.ts
  src/lib/__tests__/core-schema.test.ts

Phase 2:
  src/lib/PostQuery.ts
  src/lib/PostRepository.ts
  src/lib/OptionsRepository.ts
  src/lib/__tests__/post-query.test.ts
  src/lib/__tests__/options-repository.test.ts

Phase 3:
  src/lib/hooks.ts                          (updated)
  src/lib/SiteHookManager.ts
  src/lib/__tests__/hooks-engine.test.ts

Phase 4:
  themes/camp-classic/theme.json
  themes/camp-classic/src/               (moved from templates/shop-frontend)
  src/lib/ThemeLoader.ts
  src/lib/ThemeRegistry.ts
  src/hooks/useMeta.ts
  src/app/api/theme/route.ts
  src/app/api/themes/route.ts
  src/lib/__tests__/theme-loader.test.ts

Phase 5:
  src/lib/RequestContext.ts
  src/lib/SiteBootstrap.ts
  src/lib/getContext.ts
  src/lib/__tests__/request-context.test.ts
  src/middleware.ts                         (updated)

Phase 6:
  src/db/migrations/003_plugins_v2.sql
  src/db/migrations/004_site_plugins.sql
  src/lib/PluginLoader.ts
  src/app/api/plugins/store/route.ts
  src/app/[locale]/manage/[listingId]/plugins/page.tsx (updated)
  src/lib/__tests__/plugin-loader.test.ts

Phase 7:
  src/db/migrations/005_normalise_plans.sql
  src/lib/PlanGate.ts
  src/app/api/owner/upgrade/route.ts
  src/lib/__tests__/plan-gate.test.ts

Phase 8:
  src/db/migrations/006_build_queue.sql
  src/app/api/manifest.webmanifest/route.ts
  src/app/api/media/[siteId]/[key]/route.ts
  src/app/api/admin/build-queue/route.ts
  src/lib/listeners/buildListener.ts

Phase 9:
  src/app/api/public/listings/route.ts

Phase 10:
  src/app/[locale]/manage/[listingId]/posts/[postType]/page.tsx
  src/app/[locale]/manage/[listingId]/posts/[postType]/[postId]/page.tsx
  src/app/api/site/posts/route.ts
  src/app/api/site/posts/[postId]/route.ts
  src/app/api/site/options/route.ts

Phase 11:
  src/db/migrations/007_plugin_submissions.sql
  src/app/api/plugins/submit/route.ts
  src/app/api/admin/plugins/submissions/route.ts
  src/app/[locale]/admin/plugins/page.tsx   (updated)
```

---

## Appendix D — What Stays Unchanged

The following are **intentionally not touched** until explicitly specified:

- `properties` table — kept as-is for backward-compat; `sites` is additive.
- `property_plugins` / `property_staff` tables — kept alongside new `site_plugins`.
- `packages/plugin-sdk/src/types.ts` — additive changes only; no breaking changes.
- All 18 existing plugins — they continue to work via the backward-compat `PluginAPI` shim.
- `templates/shop-frontend/` — kept frozen; `themes/camp-classic/` is the new home.
- All 665 unit tests and 131 E2E tests — must remain green after every phase.
