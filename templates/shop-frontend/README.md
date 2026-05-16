# CampOps Shop Frontend Template

React + TypeScript + Vite template for generating branded camp/hotel shop websites.

## Overview

This is the base template used by CampOps to generate individual shop frontends. Each camp gets a branded build with their own colors, logo, content, and domain.

## Build a Shop

```bash
# Build for a specific shop (run from marketplace root)
./scripts/build-shop.sh <shop-slug> [environment] [api-base]

# Example:
./scripts/build-shop.sh safari-camp production https://api.campops.com
```

## Development

```bash
cd templates/shop-frontend

# Install dependencies
npm install

# Start development server (uses demo branding)
npm run dev

# Build for production
npm run build
```

## Template Structure

```
src/
├── components/ui/          # shadcn/ui base components
├── components/page-builder/ # CMS components
├── contexts/               # React contexts (Auth, Branding, etc.)
├── hooks/                  # Custom hooks & React Query
│   ├── queries/            # Data fetching hooks
│   ├── useTenant.ts        # Tenant resolution
│   └── useBranding.ts      # Branding application
├── lib/                    # Utilities & clients
│   ├── api.ts              # Axios client
│   ├── socket.ts           # WebSocket client
│   └── utils.ts            # Helpers
├── pages/                  # Route pages
│   ├── auth/               # Login, Signup
│   ├── billing/            # Folio, Payments
│   ├── guest/              # Guest portal
│   ├── public/             # Public-facing pages
│   ├── admin/              # Admin dashboard
│   ├── staff/              # Staff portal
│   └── pos/                # Point of sale
└── App.tsx                 # Router with branding support
```

## Branding System

The template uses `VITE_*` environment variables for build-time branding:

- `VITE_SHOP_NAME` - Camp name
- `VITE_SHOP_SLUG` - Unique identifier
- `VITE_PRIMARY_COLOR` - Brand primary color
- `VITE_LOGO_URL` - Logo image URL
- `VITE_HERO_IMAGE` - Hero background image
- ... (50+ variables total)

See `/api/branding` endpoint for full branding schema.

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm run test` - Unit tests (Vitest)

## License

Part of CampOps Marketplace - Internal use only
