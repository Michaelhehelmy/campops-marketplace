# Customization — Theming, Branding & Layout

CampOps Marketplace is built with Tailwind CSS and designed to be fully white-labeled. This guide covers every customization point.

---

## Brand colours

The brand colour palette is defined in `tailwind.config.ts`:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      brand: {
        50:  "#f0fdf4",
        100: "#dcfce7",
        300: "#86efac",
        400: "#4ade80",
        500: "#22c55e",
        600: "#16a34a",   // ← primary action colour
        700: "#15803d",
        900: "#14532d",
      },
    },
  },
},
```

**To change the brand colour**, replace the `brand.*` values with your own. Use [uicolors.app](https://uicolors.app/create) to generate a full scale from one hex value.

All components use `text-brand-600`, `bg-brand-600`, `hover:bg-brand-700` etc., so a single palette change propagates everywhere.

---

## Logo & site name

1. Replace `src/components/Nav.tsx` — the `<Link>` with the site name text.
2. Place your logo in `public/logo.svg` and reference it with `<Image src="/logo.svg" … />`.
3. Update `<title>` defaults in `src/app/layout.tsx` and per-page `export const metadata`.

---

## Custom fonts

Install and configure a Google Font or any web font in `src/app/layout.tsx`:

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      ...
    </html>
  );
}
```

---

## Navigation items

Edit `src/components/Nav.tsx`. The Nav component renders links from a static array — add or remove entries as needed.

---

## Footer

Edit `src/components/Footer.tsx`. The footer is a plain React component — adjust links, social icons, legal text, and copyright year.

---

## Adding new public pages

Create a file at `src/app/[locale]/your-page/page.tsx`:

```tsx
// src/app/[locale]/about/page.tsx
export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">About Us</h1>
      <p>Your content here.</p>
    </div>
  );
}
```

It will automatically be available at `/en/about` (and any other configured locale).

---

## Internationalisation (i18n)

Translation strings live in `src/messages/en.json`. To add a new language:

1. Create `src/messages/fr.json` (copy `en.json` as a starting point).
2. Open `src/i18n/request.ts` and add `"fr"` to the `locales` array.
3. Translate all strings in `fr.json`.

The `next-intl` middleware will automatically handle `/fr/*` routes.

---

## Search form

The `SearchForm` component (`src/components/SearchForm.tsx`) controls the search UI. You can:

- Add or remove input fields (e.g., a "property type" dropdown).
- Adjust default values.
- Change the styling by editing Tailwind classes.

---

## Property card

`src/components/PropertyCard.tsx` renders each result. Customise the layout, add badges, or change the image aspect ratio here.

---

## Disabling the owner registration flow

If you do not want public self-registration, simply remove the `/list-your-camp` pages or add a redirect in `middleware.ts`:

```typescript
if (barePath.startsWith('/list-your-camp')) {
  return NextResponse.redirect(new URL('/en', req.url));
}
```

---

## CSS utilities

Key utility classes defined in `src/app/globals.css`:

| Class          | Purpose                        |
| -------------- | ------------------------------ |
| `.btn-primary` | Green action button            |
| `.card`        | White rounded card with shadow |
| `.input`       | Styled form input field        |

Add your own in the `@layer components` block.
