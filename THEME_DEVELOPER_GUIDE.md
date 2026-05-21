# Theme Developer Guide

## Overview

A theme changes the entire look and feel of a marketplace site.  
Themes live under `themes/<theme-id>/` and consist of a `theme.json` manifest,
template files, assets, and optional branding context.

A theme is **business‑agnostic** — it should not hardcode camping, hospitality,
or any specific vertical. The same theme should work for campsites, hotels,
restaurants, equipment rental, or any other business type.

## Quick Start

```bash
cp -r themes/starter themes/my-theme
# Edit theme.json, then activate via the admin panel
```

## Required Files

```
themes/<theme-id>/
  theme.json           # Manifest — id, name, version, template hierarchy
  templates/           # Page template overrides (optional)
    homepage.tsx
    listing-detail.tsx
    booking.tsx
  assets/              # Static assets (optional)
    screenshot.png
    logo.svg
  BrandingContext.tsx  # Branding defaults (optional)
```

### `theme.json`

```json
{
  "id": "my-theme",
  "name": "my-theme",
  "displayName": "My Theme",
  "description": "A clean, responsive theme.",
  "version": "1.0.0",
  "author": "Your Name",
  "planRequirement": "basic",
  "screenshot": "/themes/my-theme/screenshot.png",
  "templateHierarchy": {
    "listing": ["listing-detail", "default"],
    "booking": ["booking", "default"],
    "page": ["page", "default"]
  },
  "widgetAreas": [{ "id": "sidebar", "label": "Sidebar" }],
  "customFields": [],
  "supports": {
    "darkMode": true
  }
}
```

| Field               | Required | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `id`                | Yes      | Unique theme identifier                             |
| `displayName`       | Yes      | Human-readable name                                 |
| `planRequirement`   | Yes      | Minimum plan: `basic`, `premium`, `ultimate`        |
| `templateHierarchy` | No       | Ordered list of template names to try per post type |

### Templates

Place `.tsx` files in `templates/`. The theme loader resolves templates based
on the hierarchy defined in `theme.json`. Template files receive the page's
data via props — they must be self-contained React components.

```tsx
// themes/my-theme/templates/homepage.tsx
export default function Homepage({ listings, categories }: any) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Welcome</h1>
      {/* Render listings, categories, etc. */}
    </div>
  );
}
```

If no template file is found, the system falls back to the default core
component for that page type.

### Branding Context (Optional)

`BrandingContext.tsx` can export a `BrandingProvider` component that wraps
the entire site and provides default colors, fonts, and logos. These defaults
are overridden by per-site branding settings stored in the database.

```tsx
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  return <div className="theme-branding">{children}</div>;
}

export function useBranding() {
  return { name: 'My Site', colors: { primary: '#000' } };
}
```

## How Themes Are Loaded

1. **Server startup** — `ThemeRegistry.register(db)` scans `themes/`, reads each
   `theme.json`, upserts into the `available_themes` table.
2. **Per request** — Middleware resolves the site, then `ThemeRegistry.getForSite()`
   reads the `active_theme` option from the database.
3. **ThemeLoader.load(themeId)** reads `theme.json` from disk (cached in memory).
4. Templates are resolved via `ThemeLoader.resolveTemplate(themeId, postType)`.
5. The `core:theme:loaded` hook fires after a theme is activated for a site.

## Creating a New Theme

1. Copy `themes/starter/` to `themes/my-theme/`.
2. Edit `theme.json` with your theme's identity.
3. Add template files to `templates/` for the page types you want to customise.
4. Add a `screenshot.png` (1200×900 recommended).
5. Restart the dev server — the theme appears in `GET /api/themes`.
6. Activate via the admin panel or `ThemeRegistry.activate(db, siteId, themeId)`.

## Rules

1. **No hardcoded business logic** — themes render data, they don't create it.
2. **No camping-specific terms** — use generic language (e.g., "listing" not "campsite").
3. **All text should be translatable** via `next-intl` or passed as props.
4. **Images and colors come from branding settings** — not hardcoded in theme files.
5. **Templates are fallbacks** — the core always has a default renderer.
