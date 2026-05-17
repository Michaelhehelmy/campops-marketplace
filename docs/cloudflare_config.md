# Cloudflare Configuration Guide

**Last updated:** May 17, 2026

## Current Status

| Domain | DNS | Proxy | Target | Notes |
|--------|-----|-------|--------|-------|
| `sinaicamps.com` | ✅ A → `84.235.239.6` | ✅ Orange | Oracle VM :80 | SSL pending |
| `api.sinaicamps.com` | ✅ A → `84.235.239.6` | ✅ Orange | Oracle VM :80 | SSL pending |
| `acaciacamp.com` | ✅ Proxied | ✅ Orange | Cloudflare Pages | ⚠️ Custom domain not yet added to Pages project |

---

## 1. DNS Records (sinaicamps.com zone)

These are already configured. Verify in Cloudflare dashboard → `sinaicamps.com` → DNS:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `84.235.239.6` | Proxied (orange) |
| A | `api` | `84.235.239.6` | Proxied (orange) |

---

## 2. SSL/TLS Settings for sinaicamps.com — ⚠️ ACTION REQUIRED

**Problem:** Cloudflare proxy intercepts HTTP, so Let's Encrypt HTTP challenge fails.

### Step-by-step fix (choose one option):

#### Option A — Temporarily grey-cloud (fastest)
1. In Cloudflare DNS, click the orange cloud on `@` and `api` → set to **DNS only** (grey)
2. SSH to VM and run:
   ```bash
   sudo certbot certonly --nginx -d sinaicamps.com -d api.sinaicamps.com \
     --non-interactive --agree-tos --email admin@sinaicamps.com
   sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. Turn both DNS records back to **Proxied (orange)**
4. Go to SSL/TLS → set mode to **Full (Strict)**

#### Option B — Cloudflare Origin Certificate (no certbot, stays proxied)
1. Cloudflare → SSL/TLS → **Origin Server** → **Create Certificate**
2. Hostnames: `sinaicamps.com`, `*.sinaicamps.com` — validity: 15 years
3. Copy the PEM output to the VM:
   ```bash
   sudo mkdir -p /etc/letsencrypt/live/sinaicamps.com
   sudo nano /etc/letsencrypt/live/sinaicamps.com/fullchain.pem   # paste cert
   sudo nano /etc/letsencrypt/live/sinaicamps.com/privkey.pem     # paste key
   sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. SSL/TLS → set mode to **Full (Strict)**

---

## 3. acaciacamp.com — Cloudflare Pages Custom Domain — ⚠️ ACTION REQUIRED

The Pages project `acaciacamp` is live at `https://acaciacamp.pages.dev` but `acaciacamp.com` is not yet connected to it.

### Steps:
1. Go to [Cloudflare Pages dashboard](https://dash.cloudflare.com) → **Pages** → project `acaciacamp`
2. Click **Custom Domains** tab → **Set up a custom domain**
3. Enter `acaciacamp.com` → Continue
4. Cloudflare will verify the domain is in your account and auto-configure DNS + SSL
5. Also add `www.acaciacamp.com` pointing to the same project

> Cloudflare handles SSL automatically for Pages custom domains — no certificate setup needed.

---

## 4. SSL/TLS Global Settings (sinaicamps.com zone)

After certs are set up on the VM:

| Setting | Value |
|---------|-------|
| SSL/TLS encryption mode | **Full (Strict)** |
| Always Use HTTPS | **On** |
| Automatic HTTPS Rewrites | **On** |
| Min TLS Version | TLS 1.2 |

---

## 5. DNS Records (acaciacamp.com zone)

These should already exist. After connecting the Pages custom domain, Cloudflare will manage them:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `acaciacamp.pages.dev` | Proxied (orange) |
| CNAME | `www` | `acaciacamp.pages.dev` | Proxied (orange) |

---

## 6. CI/CD — GitHub Actions Deployment

Push to `main` → `.github/workflows/deploy.yml` triggers:
- **`deploy-oracle` job**: builds Next.js, rsyncs to VM, runs `deploy-prod.sh`
- **`deploy-cloudflare` job** (on `tenant/**` branches): builds shop-frontend, deploys to CF Pages

### Required GitHub Secrets

Go to repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Value |
|--------|-------|
| `ORACLE_KEY` | Full contents of `/home/michael/Downloads/oracle.key` |
| `ORACLE_IP` | `84.235.239.6` |
| `CLOUDFLARE_API_TOKEN` | CF API token with Pages:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## 7. Security Checklist

- [ ] SSL/TLS mode set to **Full (Strict)** on sinaicamps.com
- [ ] SSL/TLS mode set to **Full (Strict)** on acaciacamp.com
- [ ] Always Use HTTPS enabled on both zones
- [ ] GitHub secrets `ORACLE_KEY` and `ORACLE_IP` configured
- [ ] GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` configured
- [ ] `acaciacamp.com` custom domain added to Pages project
- [ ] PM2 auto-start enabled on VM (`pm2 startup` command run)
