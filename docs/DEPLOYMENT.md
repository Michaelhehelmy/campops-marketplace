# Production Deployment Guide

**Last updated:** May 2026

## Architecture

```
Browser
  │
  ▼
Cloudflare (DNS + Proxy)
  │
  ├─ yourdomain.com ───────────────► Linux Server :443 ─► PM2 :3000 (Next.js)
  ├─ api.yourdomain.com ───────────► Linux Server :443 ─► PM2 :3000 (Next.js API)
  │
  └─ tenant.com ───────────────────► Cloudflare Pages (Vite SPA)
                                          └─ API calls ──► api.yourdomain.com
```

---

## Key Variables (fill in your own)

| Variable | Example | Description |
|----------|---------|-------------|
| `YOUR_SERVER_IP` | `1.2.3.4` | Public IP of your Linux server |
| `YOUR_SSH_KEY` | `~/.ssh/id_rsa` | Path to your SSH private key |
| `YOUR_SSH_USER` | `ubuntu` | SSH user on the server |
| `YOUR_APP_DIR` | `~/marketplace` | App directory on server |
| `YOUR_DOMAIN` | `yourdomain.com` | Your marketplace domain |
| `YOUR_PM2_NAME` | `campops` | PM2 process name |

---

## Phase 1: Server Infrastructure

### 1.1 Supported Platforms
Any Ubuntu 22.04/24.04 LTS server with a public IP:
- **Oracle Cloud** — free tier: `VM.Standard.A1.Flex` (4 OCPUs, 24GB RAM)
- **DigitalOcean** — $6/mo Droplet
- **AWS/GCP/Azure** — any standard VM
- **Hetzner** — CX11 or better

### 1.2 Required Open Ports
Open these in your cloud provider's firewall/security group **and** in the server's iptables:

| Port | Purpose |
|------|---------|
| 22 | SSH |
| 80 | HTTP (required for Cloudflare proxy) |
| 443 | HTTPS |

```bash
# Ubuntu iptables (run on server)
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

> **Oracle Cloud:** You must also open ports 80 and 443 in the OCI Console → Networking → VCN → Security Lists (cloud-level firewall, separate from iptables).

---

## Phase 2: Server Software Installation

SSH into your server and run:

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx + SSL tools + rsync
sudo apt install -y nginx certbot python3-certbot-nginx rsync vim

# PM2 (global process manager)
sudo npm install -g pm2
```

---

## Phase 3: Environment Configuration

Create `.env.production` in your project root (never commit this file):

```env
NODE_ENV=production
PORT=3000

# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=<your-random-secret>

# Your domain names
NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database (SQLite — change path as needed)
DATABASE_URL=file:./campops-prod.db

# Auth
NEXTAUTH_URL=https://yourdomain.com
AUTH_TRUST_HOST=true

# Comma-separated list of allowed origins
TRUSTED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
# Add tenant domains as you create them:
# TRUSTED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com,https://tenant.com
```

---

## Phase 4: First Deployment (from local machine)

```bash
# 1. Build
cp .env.production .env.local
npm run build
bash scripts/fix-standalone.sh

# 2. Sync to server
rsync -avz -e "ssh -i YOUR_SSH_KEY" \
  .next/standalone/ YOUR_SSH_USER@YOUR_SERVER_IP:YOUR_APP_DIR/

rsync -avz -e "ssh -i YOUR_SSH_KEY" \
  .next/static/ YOUR_SSH_USER@YOUR_SERVER_IP:YOUR_APP_DIR/.next/static/

rsync -avz -e "ssh -i YOUR_SSH_KEY" \
  public/ YOUR_SSH_USER@YOUR_SERVER_IP:YOUR_APP_DIR/public/

rsync -avz -e "ssh -i YOUR_SSH_KEY" \
  plugins/ YOUR_SSH_USER@YOUR_SERVER_IP:YOUR_APP_DIR/plugins/

scp -i YOUR_SSH_KEY \
  .env.production nginx-unified.conf \
  scripts/boot.sh scripts/deploy-prod.sh \
  YOUR_SSH_USER@YOUR_SERVER_IP:YOUR_APP_DIR/

# 3. Rebuild native modules on server
ssh -i YOUR_SSH_KEY YOUR_SSH_USER@YOUR_SERVER_IP \
  "cd YOUR_APP_DIR && npm rebuild better-sqlite3"

# 4. Start app
ssh -i YOUR_SSH_KEY YOUR_SSH_USER@YOUR_SERVER_IP \
  "cd YOUR_APP_DIR && pm2 restart YOUR_PM2_NAME || pm2 start server.js --name YOUR_PM2_NAME && pm2 save"
```

### 4.1 Enable PM2 Auto-Start on Reboot (run once on server)
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u YOUR_SSH_USER --hp /home/YOUR_SSH_USER
pm2 save
```

---

## Phase 5: SSL Certificates

When using Cloudflare proxy (orange cloud), the Let's Encrypt HTTP challenge is intercepted. Use one of these options:

### Option A — Cloudflare Origin Certificate (recommended — works with proxy enabled)
1. Cloudflare dashboard → your zone → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Hostnames: `yourdomain.com`, `*.yourdomain.com` — validity: 15 years
3. Copy the **Origin Certificate** (PEM) and **Private Key** to the server:
   ```bash
   sudo mkdir -p /etc/ssl/your-domain
   sudo vi /etc/ssl/your-domain/fullchain.pem   # paste Origin Certificate
   sudo vi /etc/ssl/your-domain/privkey.pem     # paste Private Key
   ```
4. Also append the Cloudflare CA root to complete the chain:
   ```bash
   sudo bash -c 'curl -s https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem >> /etc/ssl/your-domain/fullchain.pem'
   ```
5. Update `nginx-unified.conf` cert paths, then reload:
   ```bash
   sudo cp YOUR_APP_DIR/nginx-unified.conf /etc/nginx/sites-available/campops
   sudo nginx -t && sudo systemctl reload nginx
   ```
6. Cloudflare SSL/TLS → set mode to **Full (Strict)**

### Option B — Let's Encrypt (temporarily disable proxy)
1. Cloudflare DNS → set `@` and `api` records to **DNS only** (grey cloud)
2. On server:
   ```bash
   sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com \
     --non-interactive --agree-tos --email admin@yourdomain.com
   ```
3. Re-enable Cloudflare proxy → set SSL mode to **Full (Strict)**

---

## Phase 6: Nginx Configuration

The `nginx-unified.conf` in the repo root is the template. Update the domain names and cert paths for your deployment, then:

```bash
sudo cp YOUR_APP_DIR/nginx-unified.conf /etc/nginx/sites-available/campops
sudo ln -sf /etc/nginx/sites-available/campops /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The config handles:
- HTTP → HTTPS redirect
- `yourdomain.com` → proxy to `localhost:3000`
- `api.yourdomain.com` → proxy to `localhost:3000` with CORS + no-cache headers

---

## Phase 7: GitHub Actions CI/CD (optional)

Push to `main` → `.github/workflows/deploy.yml` auto-deploys.

**Required GitHub Secrets** (repo → Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `ORACLE_KEY` | Contents of your SSH private key file |
| `ORACLE_IP` | Your server's public IP |
| `CLOUDFLARE_API_TOKEN` | CF API token with Pages:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## Phase 8: Tenant Shop Frontends (Cloudflare Pages)

```bash
# 1. Build the tenant's branded frontend
bash scripts/build-shop.sh <tenant-slug> production https://api.yourdomain.com
# Output: builds/<tenant-slug>/dist/

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy builds/<tenant-slug>/dist \
  --project-name <cf-project-name> \
  --branch main

# 3. Add custom domain in Cloudflare Pages dashboard
# → Pages → <project> → Custom Domains → Add domain
```

See [cloudflare_config.md](cloudflare_config.md) for full Cloudflare setup.

---

## Phase 9: Add a New Tenant Property

On the server, run:
```bash
cd YOUR_APP_DIR
node -e "
const db = require('better-sqlite3')('campops-prod.db');
const now = Date.now();
db.prepare(\`INSERT OR REPLACE INTO properties
  (id, slug, name, is_active, custom_domain, plan, branding, settings, created_at)
  VALUES (?, ?, ?, 1, ?, 'premium', ?, '{}', ?)\`)
.run(
  'tenant-id-1', 'my-tenant', 'My Tenant Name',
  'mytenantdomain.com',
  JSON.stringify({ name: 'My Tenant', colors: { primary: '#0f172a' } }),
  now
);
console.log('Done');
"
```

Then add `https://mytenantdomain.com` to `TRUSTED_ORIGINS` in `.env.production` and restart:
```bash
pm2 restart YOUR_PM2_NAME --update-env
```

---

## Maintenance

```bash
# SSH into server
ssh -i YOUR_SSH_KEY YOUR_SSH_USER@YOUR_SERVER_IP

# App status
pm2 list
pm2 logs YOUR_PM2_NAME --lines 50

# Restart with updated env
pm2 restart YOUR_PM2_NAME --update-env

# Health check
curl http://localhost:3000/api/health

# Nginx
sudo nginx -t && sudo systemctl reload nginx

# View properties in DB
cd YOUR_APP_DIR
node -e "
const db = require('better-sqlite3')('campops-prod.db');
console.table(db.prepare('SELECT id,slug,name,custom_domain FROM properties').all());
"
```
