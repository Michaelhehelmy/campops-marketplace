# Cloudflare Deployment Configuration

## Architecture Overview

SinaiCamps Marketplace uses a hybrid deployment model suitable for Cloudflare:

- **Cloudflare CDN/WAF**: Caches static assets, handles SSL termination, and proxies API requests.
- **Backend Service**: Can be hosted on a PaaS (Render, Railway, Fly.io) or VPS using the provided `Dockerfile`.

## DNS Configuration

To support tenant subdomains, configure a wildcard DNS record in Cloudflare:

- **Type**: CNAME (or A record if using an IP)
- **Name**: `*`
- **Target**: `sinaicamps.com` (or your root origin hostname)
- **Proxy status**: Proxied (Orange cloud)

## Page Rules / Cache Rules

Ensure API and dynamic routes bypass the cache to maintain tenant isolation and authentication contexts:

1. **Bypass Cache for API**:
   - URL: `*sinaicamps.com/api/*`
   - Cache Level: Bypass
2. **Bypass Cache for Dashboard**:
   - URL: `*sinaicamps.com/dashboard/*`
   - Cache Level: Bypass
3. **Cache Static Assets**:
   - URL: `*sinaicamps.com/_next/static/*`
   - Cache Level: Cache Everything

## Edge Rules for Tenancy

If hosting multiple tenants on custom domains (e.g., `tenant1.com`), ensure you have **Cloudflare Custom Hostnames (SSL for SaaS)** configured to map their domain to your core infrastructure, allowing Next.js middleware to resolve the hostname.

## Environment Variables

Ensure the origin server's `.env` configuration contains:

```env
NEXT_PUBLIC_BASE_DOMAIN=sinaicamps.com
```

This is essential for the Next.js middleware to correctly extract tenant subdomains (e.g., `safari.sinaicamps.com` -> `safari`).
