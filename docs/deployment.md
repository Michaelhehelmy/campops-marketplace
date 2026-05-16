# Deployment

This guide covers deploying SinaiCamps Marketplace to production. The app is a standard Next.js application and can be deployed anywhere Node.js runs.

---

## Option 1 — Vercel (recommended for most teams)

Vercel is the simplest option and requires no infrastructure management.

### Steps

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. Set environment variables in the Vercel dashboard:

```
NEXT_PUBLIC_API_URL         = https://api.yourcamp.com
NEXT_PUBLIC_BASE_DOMAIN     = yourcamp.com
ADMIN_SPA_URL               = https://admin-internal.yourcamp.com
JWT_SECRET                  = <same value as your backend>
```

4. Click **Deploy**. Vercel handles builds, CDN, and HTTPS automatically.

### Wildcard subdomain support on Vercel

Add a wildcard domain in your Vercel project settings:

- `*.yourcamp.com` → your Vercel deployment

Then add a wildcard `A` or `CNAME` DNS record pointing to Vercel's IP.

---

## Option 2 — Docker (self-hosted)

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
```

> Requires `output: "standalone"` in `next.config.mjs`:
>
> ```js
> const nextConfig = { output: "standalone", ... };
> ```

### Build & run

```bash
docker build -t sinaicamps-marketplace .
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=https://api.yourcamp.com \
  -e NEXT_PUBLIC_BASE_DOMAIN=yourcamp.com \
  sinaicamps-marketplace
```

---

## Option 3 — Custom VPS / Ubuntu

### Requirements

- Ubuntu 22.04+
- Node.js 20 (via [nvm](https://github.com/nvm-sh/nvm))
- [Caddy](https://caddyserver.com) (handles TLS + reverse proxy)
- PM2 (process manager)

### Steps

```bash
# Install PM2
npm install -g pm2

# Clone and build
git clone https://github.com/your-org/sinaicamps-marketplace.git
cd sinaicamps-marketplace
npm install
npm run build

# Start with PM2
pm2 start npm --name "marketplace" -- run start
pm2 save
pm2 startup
```

### Caddy configuration

```caddy
# /etc/caddy/Caddyfile

# Wildcard for subdomains (requires DNS-01 challenge)
*.sinaicamps.com, sinaicamps.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Forwarded-Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```

### On-demand TLS for custom domains

```caddy
{
    on_demand_tls {
        # Caddy asks this endpoint whether to provision a cert for the domain
        ask http://localhost:5000/api/tenant/resolve?host={host}
        interval 2m
        burst    5
    }
}

:443 {
    tls { on_demand }
    reverse_proxy localhost:3001 {
        header_up Host {host}
    }
}
```

---

## Environment variables for production

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourcamp.com
NEXT_PUBLIC_BASE_DOMAIN=yourcamp.com
ADMIN_SPA_URL=https://admin-internal.yourcamp.com
JWT_SECRET=<long-random-string>
```

Store secrets with your hosting provider's secret manager — never commit them to Git.

---

## DNS setup

```
# Minimum DNS records
A     yourcamp.com       → <server-ip>
A     *.yourcamp.com     → <server-ip>    ← wildcard for tenant subdomains
CNAME www.yourcamp.com   → yourcamp.com
```

---

## Health check

After deployment, verify:

```bash
curl https://yourcamp.com/en             # → 200, HTML
curl https://yourcamp.com/api/feature-flags  # → 200, JSON (via proxy)
curl https://campname.yourcamp.com/en    # → 200, tenant-resolved page
```
