import { MetadataRoute } from 'next';

/**
 * Static web manifest for the main marketplace platform (sinaicamps.com).
 *
 * This manifest is for the platform shell (master, admin, manager, guest roles).
 * Tenant custom-domain manifests are served dynamically from:
 *   GET /api/manifest.webmanifest?siteId=<id>
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SinaiCamps Marketplace',
    short_name: 'SinaiCamps',
    description: 'Find and book your perfect camp stay in the Sinai Peninsula',
    start_url: '/',
    id: 'sinaicamps-marketplace',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'en',
    scope: '/',
    categories: ['travel', 'hospitality', 'lifestyle'],
    icons: [
      {
        src: '/sinaicamps.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/sinaicamps.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'Search Camps',
        url: '/en/search',
        description: 'Search for available camps',
      },
      {
        name: 'My Bookings',
        url: '/en/guest',
        description: 'View your bookings',
      },
    ],
  };
}
