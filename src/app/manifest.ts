import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SinaiCamps Marketplace',
    short_name: 'SinaiCamps',
    description: 'Find and book your perfect camp stay',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/sinaicamps.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/sinaicamps.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
