# Design/Theme & UX/Accessibility Audit Report

Audited: Homepage (`/en`), Listing detail (`/en/stay/[slug]`), Owner Property (`/en/owner/property`)

---

## Design / Theme Audit

### Critical

- **No theme token system.** `tailwind.config.ts` only defines a `brand` color palette (green tones). All components use hardcoded colors: `amber-400/500/600` in marketplace Nav, `colors.secondary` (blue/purple) from tenant branding in ShopfrontNav, `gray-*` in owner property page. No spacing, shadow, animation, or typography design tokens defined.

### Major

- **Abrupt section transitions on homepage.** HeroSection (`py-24`, dark bg `from-slate-950…`) → FeaturedListings (`py-20`, `bg-white`) → Categories (`py-20`, `bg-slate-50/50`). No gradient or consistent border treatment between them. The parent `space-y-16` adds extra gap rather than a smooth visual transition.
- **Two inconsistent nav color systems.** `Nav.tsx` uses amber-500 as its accent; `ShopfrontNav.tsx` uses `colors.secondary` (tenant branding). Switching between marketplace and tenant views feels like different websites.
- **Listing detail has mixed color systems.** The header banner uses CSS custom properties (`--tenant-primary`, `--tenant-secondary`), but the booking cards use `bg-brand-600`/`hover:bg-brand-700` (green), and room type cards use `bg-white border-gray-200`. Three different color conventions on one page.

### Minor

- **Responsive breakpoints stop at `lg:` for grids.** No `xl:` or `2xl:` grid column variations on large screens. FeaturedListings uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — on wide screens cards stretch too wide.
- **Owner property page is design-isolated.** Uses `bg-white rounded-2xl border border-gray-100 shadow-sm` consistently within the page, but no visual relationship to the marketplace nav or global brand.
- **Loading spinner inconsistency.** OwnerPropertyPage uses `border-4 border-brand-600 border-t-transparent` (CSS). Homepage components use `<Loader2 className="animate-spin text-amber-500" />` (lucide). Two different spinner styles.
- **ShopfrontFooter has duplicate `'use client'` directives** (lines 1 and 3).

---

## UX / Accessibility Audit

### Critical

- **Loading states not announced to screen readers.** FeaturedListings, Categories, and OwnerPropertyPage spinners use no `aria-live="polite"` or `role="status"`. Screen reader users get no feedback that content is loading.
- **Error/success messages are not role="alert".** OwnerPropertyPage error `div` and success `div` have no ARIA live region. Validation feedback is invisible to screen readers.

### Major

- **Low contrast on nav links.** `text-zinc-400` on `bg-slate-950` (Nav.tsx desktop links) — estimated contrast ratio ~3.5:1, below WCAG AA (4.5:1). Mobile menu uses `text-zinc-300` on `bg-slate-950` — similarly borderline.
- **No skip-to-content link.** Neither Nav variant provides a skip navigation link. Keyboard users must tab through every nav item to reach main content.
- **Mobile menu missing `aria-controls`.** Both Nav.tsx and ShopfrontNav.tsx use `aria-expanded` on the hamburger button but lack `aria-controls` pointing to the mobile panel `id`. Screen readers can't associate the button with the panel it opens.

### Minor

- **FeaturedListings cards not focusable.** Each listing is an `<article role="listitem">` but the article itself isn't keyboard-focusable. Focus goes to the `<Link>` inside — fine for interaction but users lose the "card" context on focus.
- **Color pickers in branding form lack labels.** OwnerPropertyPage lines 409-413: the `<input type="color">` has no explicit `<label>` association (just a colored `span`). Screen readers see an unlabeled color picker.
- **HeroSection search form has no client-side validation.** Empty fields submit without feedback. `required` is only on the property name in OwnerPropertyPage.
- **Categories icons use raw emoji.** `{category.icon || '📌'}` — emoji rendering varies across OS/browser. No accessible name or ARIA fallback for icon-only content (the `aria-hidden="true"` on the container is correct, but emoji may be read by some screen readers differently).

---

## Summary

| Area                      | Issues Found |
| ------------------------- | ------------ |
| Design/Theme Critical     | 1            |
| Design/Theme Major        | 3            |
| Design/Theme Minor        | 4            |
| UX/Accessibility Critical | 2            |
| UX/Accessibility Major    | 3            |
| UX/Accessibility Minor    | 4            |
