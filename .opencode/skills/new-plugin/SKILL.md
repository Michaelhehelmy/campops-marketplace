---
name: create-plugin
description: Scaffold a new SinaiCamps first-party plugin following the plugin contract
---

## When to use
When the user asks to add a new feature as a plugin.

## Steps

1. **Create the plugin directory**
   ```bash
   mkdir -p plugins/{name}/src plugins/{name}/__tests__
   ```

2. **Create `plugin.json`**
   ```json
   {
     "id": "{name}",
     "name": "Human Readable Name",
     "version": "1.0.0",
     "description": "What it does",
     "author": "Michael Helmy",
     "entry": "src/index.ts",
     "hooks": ["core:request:bootstrap"],
     "post_types": [],
     "ui_slots": ["manage.sidebar"],
     "plan_requirement": "basic"
   }
   ```

3. **Create `src/index.ts`** — register with plugin engine, use `api.doAction` / `api.applyFilters`

4. **Create `src/routes/index.ts`** if the plugin needs API routes (Hono router)

5. **Create `src/ui.tsx`** if the plugin injects UI into the dashboard

6. **Add unit tests** in `__tests__/index.test.ts` using Vitest

7. **Register in DB** — add to `available_plugins` seed in `src/lib/db.ts`

8. **Verify**: `npm run test` must pass before done

## Rules
- NEVER hardcode business logic in core — all goes in plugin
- Always scope DB queries by `site_id`
- `plan_requirement` must match the feature tier
