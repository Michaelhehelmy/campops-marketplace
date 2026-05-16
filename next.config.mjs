import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_SPA_URL = process.env.ADMIN_SPA_URL ?? 'http://localhost:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || API_URL,
    NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com',
    NEXT_PUBLIC_TENANT_ID: process.env.TENANT_ID || '',
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async rewrites() {
    return [];
  },
};

export default withNextIntl(nextConfig);
