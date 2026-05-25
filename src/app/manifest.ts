import { headers } from 'next/headers';
import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = headers();
  const hostname = headersList.get('x-forwarded-host') || headersList.get('host') || '';
  const cleanHost = hostname.split(':')[0].toLowerCase();
  const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();

  const isMainDomain =
    cleanHost === BASE_DOMAIN || cleanHost === `www.${BASE_DOMAIN}` || cleanHost.endsWith(`.${BASE_DOMAIN}`);

  const platformRow = db.prepare('SELECT platform_name FROM marketplace_settings LIMIT 1').get() as
    | { platform_name: string }
    | undefined;
  const platformName = platformRow?.platform_name || 'SinaiCamps';

  if (!isMainDomain) {
    const property = db
      .prepare(
        `SELECT slug, name, branding FROM properties WHERE is_active = 1 AND (custom_domain = ? OR subdomain = ?) LIMIT 1`
      )
      .get(cleanHost, cleanHost.replace(`.${BASE_DOMAIN}`, '')) as any;

    if (property) {
      const branding = property.branding ? (() => { try { return JSON.parse(property.branding); } catch { return {}; } })() : {};
      const colors = branding?.colors || {};
      const themeColor = colors.primary || '#0f172a';
      const bgColor = colors.primary || '#0f172a';
      const logoUrl = branding?.logo?.url;

      return {
        name: property.name,
        short_name: property.name.split(' ')[0] || property.name,
        description: `${property.name} — Book your stay directly`,
        start_url: `/en/${property.slug}`,
        id: `sinaicamps-tenant-${property.slug}`,
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: bgColor,
        theme_color: themeColor,
        lang: 'en',
        scope: '/',
        categories: ['travel', 'hospitality', 'lifestyle'],
        icons: logoUrl
          ? [
              { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
              { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ]
          : [
              { src: '/sinaicamps.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
              { src: '/sinaicamps.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
        screenshots: [],
        shortcuts: [
          {
            name: 'Book Now',
            url: `/en/${property.slug}/book`,
            description: `Book your stay at ${property.name}`,
          },
          {
            name: 'Contact',
            url: `/en/${property.slug}/contact`,
            description: `Get in touch with ${property.name}`,
          },
        ],
      };
    }
  }

  return {
    name: `${platformName} Marketplace`,
    short_name: platformName.split(' ')[0] || platformName,
    description: 'Find and book your perfect camp stay',
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
