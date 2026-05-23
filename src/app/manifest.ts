import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const row = db.prepare('SELECT platform_name FROM marketplace_settings LIMIT 1').get() as { platform_name: string } | undefined;
  const platformName = row?.platform_name || 'SinaiCamps';
  const shortName = platformName.split(' ')[0] || platformName;

  return {
    name: `${platformName} Marketplace`,
    short_name: shortName,
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
