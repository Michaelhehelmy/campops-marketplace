import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const ADMIN_SPA_URL = process.env.ADMIN_SPA_URL ?? "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
    NEXT_PUBLIC_BASE_DOMAIN: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "campops.com",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      // Next.js Route Handlers at /api/auth/* must NOT be proxied to Express
      // (they are handled by the Next.js app itself)
      {
        source: "/api/auth/callback",
        destination: "/api/auth/callback",
      },
      {
        source: "/api/auth/logout",
        destination: "/api/auth/logout",
      },
      // All other /api/* calls → Express backend
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
      // /admin/* → Vite SPA (dev server or built static files)
      {
        source: "/admin",
        destination: `${ADMIN_SPA_URL}/admin`,
      },
      {
        source: "/admin/:path*",
        destination: `${ADMIN_SPA_URL}/admin/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
