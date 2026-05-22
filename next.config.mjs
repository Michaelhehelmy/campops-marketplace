import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_SPA_URL = process.env.ADMIN_SPA_URL ?? 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || API_URL,
    NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com',
    NEXT_PUBLIC_TENANT_ID: process.env.TENANT_ID || '',
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    return [
      {
        source: '/:locale/manifest.webmanifest',
        destination: '/manifest.webmanifest',
      },
    ];
  },
  async headers() {
    const corsHeaders = [
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
      {
        key: 'Access-Control-Allow-Origin',
        value: process.env.CORS_ALLOWED_ORIGIN ?? '*',
      },
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization, Cookie, X-Requested-With',
      },
    ];
    return [
      { source: '/api/manage/:path*', headers: corsHeaders },
      { source: '/api/master/:path*', headers: corsHeaders },
      { source: '/api/site/:path*', headers: corsHeaders },
      { source: '/api/public/:path*', headers: corsHeaders },
    ];
  },
};

export default withNextIntl(nextConfig);
