# Cloudflare Configuration Guide

**Last updated:** May 2026

> This guide covers DNS, SSL, and Cloudflare Pages setup for the platform. Replace `yourdomain.com`, `api.yourdomain.com`, and `tenant.com` with your actual domain names.

---

## Overview

| What                  | Where it's hosted | Cloudflare role               |
| --------------------- | ----------------- | ----------------------------- |
| Marketplace backend   | Your Linux server | DNS proxy → server            |
| API subdomain         | Same server       | DNS proxy → server            |
| Tenant shop frontends | Cloudflare Pages  | Pages hosting + custom domain |

---

## 1. Marketplace DNS Records

In Cloudflare → your zone (`yourdomain.com`) → **DNS**:

| Type | Name  | Content        | Proxy            |
| ---- | ----- | -------------- | ---------------- |
| A    | `@`   | Your server IP | Proxied (orange) |
| A    | `api` | Your server IP | Proxied (orange) |

---

## 2. SSL/TLS for the Marketplace

### Why standard certbot fails with Cloudflare proxy

When the orange cloud is enabled, Cloudflare intercepts all HTTP traffic before it reaches your server. Let's Encrypt HTTP-01 challenge requests never arrive at the server, so certificate issuance fails.

### Recommended: Cloudflare Origin Certificate

1. Cloudflare → your zone → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Add hostnames: `yourdomain.com` and `*.yourdomain.com`
3. Set validity to 15 years → **Create**
4. Copy the **Origin Certificate** and **Private Key** to your server:
   ```bash
   sudo mkdir -p /etc/ssl/campops
   sudo vi /etc/ssl/campops/fullchain.pem    # paste Origin Certificate
   sudo vi /etc/ssl/campops/privkey.pem      # paste Private Key
   ```
5. Append the Cloudflare CA root to complete the certificate chain:
   ```bash
   sudo bash -c 'curl -s https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem >> /etc/ssl/campops/fullchain.pem'
   ```
6. Update cert paths in `nginx-unified.conf`, deploy and reload:
   ```bash
   sudo cp YOUR_APP_DIR/nginx-unified.conf /etc/nginx/sites-available/campops
   sudo nginx -t && sudo systemctl reload nginx
   ```
7. Back in Cloudflare SSL/TLS → set encryption mode to **Full (Strict)**

### Alternative: Let's Encrypt (requires temporarily disabling proxy)

1. DNS → set `@` and `api` records to **DNS only** (grey cloud)
2. On server: `sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com`
3. Re-enable proxy → SSL mode → **Full (Strict)**

---

## 3. SSL/TLS Zone Settings

After certs are deployed, apply these settings to each zone:

| Setting                  | Value             |
| ------------------------ | ----------------- |
| SSL/TLS encryption mode  | **Full (Strict)** |
| Always Use HTTPS         | **On**            |
| Automatic HTTPS Rewrites | **On**            |
| Minimum TLS Version      | TLS 1.2           |

---

## 4. Tenant Shop Frontends (Cloudflare Pages)

Each tenant gets a separate Cloudflare Pages project with their own custom domain.

### 4.1 Deploy a tenant frontend

```bash
# Build
bash scripts/build-shop.sh <tenant-slug> production https://api.yourdomain.com

# Deploy to new Pages project
npx wrangler pages deploy builds/<tenant-slug>/dist \
  --project-name <project-name> \
  --branch main
```

### 4.2 Connect a custom domain

1. [Cloudflare Pages dashboard](https://dash.cloudflare.com) → **Pages** → your project
2. **Custom Domains** tab → **Set up a custom domain**
3. Enter `tenant.com` → Continue
4. Cloudflare auto-configures the DNS CNAME and issues an SSL certificate
5. Optionally add `www.tenant.com` pointing to the same project

> Cloudflare Pages SSL is fully automatic — no certificate management needed for tenant domains.

### 4.3 DNS records for tenant domain (auto-created by Pages, shown for reference)

| Type  | Name  | Content               | Proxy            |
| ----- | ----- | --------------------- | ---------------- |
| CNAME | `@`   | `<project>.pages.dev` | Proxied (orange) |
| CNAME | `www` | `<project>.pages.dev` | Proxied (orange) |

---

## 5. GitHub Actions Secrets

For automated CI/CD deployment (`.github/workflows/deploy.yml`):

Go to: repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret                  | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `ORACLE_KEY`            | Full contents of your SSH private key                               |
| `ORACLE_IP`             | Your server's public IP address                                     |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token with **Cloudflare Pages:Edit** permission      |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID (found in the right sidebar of any zone) |

To create a Cloudflare API token:

1. [Cloudflare dashboard](https://dash.cloudflare.com) → **Profile** → **API Tokens** → **Create Token**
2. Use the **Edit Cloudflare Workers** template or create a custom token with:
   - Permissions: `Cloudflare Pages:Edit`
   - Account Resources: Include your account

---

## 6. Caching

The `api.yourdomain.com` server block in `nginx-unified.conf` sends `Cache-Control: no-store` headers to prevent Cloudflare from caching API responses.

If you ever see stale HTML being returned from the API subdomain, purge the cache:

- Cloudflare → your zone → **Caching** → **Configuration** → **Purge Everything**

---

## 7. Setup Checklist

- [ ] A record for `@` pointing to server IP (proxied)
- [ ] A record for `api` pointing to server IP (proxied)
- [ ] Cloudflare Origin Certificate created and deployed to server
- [ ] Cloudflare CA root appended to `fullchain.pem`
- [ ] Nginx deployed and reloaded with correct cert paths
- [ ] SSL/TLS mode set to **Full (Strict)**
- [ ] Always Use HTTPS enabled
- [ ] Each tenant Pages project deployed
- [ ] Custom domains added to Pages projects
- [ ] GitHub secrets `ORACLE_KEY`, `ORACLE_IP`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` configured
- [ ] PM2 auto-start enabled on server (`pm2 startup` + `pm2 save`)
