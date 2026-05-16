# Deployment Guide

This guide covers the production deployment of the CampOps Marketplace.

## Prerequisites

- Node.js 20+
- SQLite (or PostgreSQL for multi-node deployments)
- Docker (optional but recommended)

## Production Build

1. **Environment Variables**:
   Create a `.env.production` file:

   ```env
   BETTER_AUTH_SECRET=your-32-char-secret
   NEXT_PUBLIC_BASE_DOMAIN=campops.com
   NEXT_PUBLIC_API_URL=https://api.campops.com
   DATABASE_URL=file:./campops.db
   ```

2. **Build and Start**:
   ```bash
   npm run build
   npm run start
   ```

## Docker Deployment

The `Dockerfile` is optimized using Next.js standalone output.

```bash
docker build -t campops-marketplace .
docker run -p 3000:3000 campops-marketplace
```

## Infrastructure Configuration

### Reverse Proxy (Nginx)

The production environment uses the pre-configured `nginx-multi-tenant.conf` which handles wildcard subdomains, SSL termination, and HSTS.

```bash
# Verify configuration
nginx -t -c $(pwd)/nginx-multi-tenant.conf

# Symbolically link to nginx sites-enabled
sudo ln -s $(pwd)/nginx-multi-tenant.conf /etc/nginx/sites-enabled/campops
sudo systemctl reload nginx
```

### Wildcard SSL (Let's Encrypt)

To support subdomains, use the DNS-01 challenge with Certbot.

1. **Obtain Certificate**:
   ```bash
   sudo certbot certonly --manual --preferred-challenges dns -d marketplace.com -d "*.marketplace.com"
   ```
2. **Auto-Renewal**:
   A renewal script is provided at `scripts/renew-ssl.sh`. Add it to your crontab:
   ```bash
   0 0 * * * /path/to/campops-marketplace/scripts/renew-ssl.sh >> /var/log/campops-ssl.log 2>&1
   ```

## PostgreSQL Configuration

For production-grade scalability, use PostgreSQL instead of SQLite.

1. **Environment Variable**:
   Set `DATABASE_URL` in `.env.production`:

   ```env
   DATABASE_URL=postgres://user:password@host:5432/campops
   ```

2. **Run Migration**:
   Execute the migration script to create the schema and seed the initial master admin.

   ```bash
   ./scripts/migrate-to-pg.sh
   ```

3. **Verify**:
   Check that all core and plugin tables are created:
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

## Maintenance

### Backup & Restore (PostgreSQL)

**Backup**:

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

**Restore**:

```bash
psql $DATABASE_URL -f backup_file.sql
```

### Plugin Updates

Plugins are located in `/plugins`. The system automatically discovers and initializes them on start.
To force a plugin reload or initialize new plugin tables without restarting the server, visit `/api/health`.

### Database Migrations

For core schema changes, update `src/db/schema.ts` and use:

```bash
# SQLite (Development)
npx drizzle-kit push:sqlite

# PostgreSQL (Production)
npx drizzle-kit push:pg
```
