# SinaiCamps: Deployment Guide

**Last updated:** May 17, 2026

## Current Live Status

| Component | Status | URL |
|-----------|--------|-----|
| Oracle VM | ✅ Running | `84.235.239.6` |
| Marketplace app (PM2) | ✅ Online (10h uptime) | `http://localhost:3000` |
| Nginx | ✅ Active (HTTP only) | port 80 |
| SSL certificates | ❌ Not yet issued | — |
| `sinaicamps.com` DNS | ✅ Cloudflare proxied → VM | — |
| `api.sinaicamps.com` DNS | ✅ Cloudflare proxied → VM | — |
| Acacia tenant (CF Pages) | ✅ Deployed | `https://acaciacamp.pages.dev` |
| `acaciacamp.com` DNS | ✅ Cloudflare proxied | Custom domain pending in Pages |
| Acacia DB record | ✅ Seeded | slug: `acacia`, domain: `acaciacamp.com` |

---

## Architecture

```
Browser
  │
  ▼
Cloudflare (DNS + Proxy)
  │
  ├─ sinaicamps.com ──────────────► Oracle VM :80/:443 ─► PM2 :3000 (Next.js)
  ├─ api.sinaicamps.com ──────────► Oracle VM :80/:443 ─► PM2 :3000 (Next.js API)
  │
  └─ acaciacamp.com ──────────────► Cloudflare Pages (Vite SPA)
                                         │
                                         └─ API calls ──► api.sinaicamps.com
```

---

## Key Facts

- **VM IP**: `84.235.239.6`
- **SSH key**: `/home/michael/Downloads/oracle.key`
- **SSH user**: `ubuntu`
- **App directory**: `~/marketplace`
- **Database**: `~/marketplace/campops-prod-sim.db` (SQLite)
- **PM2 app name**: `sinaicamps`
- **Node.js on VM**: v20.20.2
- **GitHub repo**: `https://github.com/Michaelhehelmy/campops-marketplace`

---

## Phase 1: Oracle Cloud Infrastructure (OCI)

### 1.1 VM Setup (one-time)
- **Image**: Ubuntu 24.04 LTS
- **Shape**: `VM.Standard.E4.Flex` (or free tier `VM.Standard.A1.Flex`)
- **Networking**: Public subnet with Internet Gateway

### 1.2 OCI Security List — Required Ingress Rules
Go to: OCI Console → Networking → Virtual Cloud Networks → your VCN → Security Lists

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | 0.0.0.0/0 | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP / Certbot challenge |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

### 1.3 Ubuntu Firewall (iptables — already open on this VM)
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## Phase 2: Server Software (already installed on this VM)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx + Certbot + tools
sudo apt install -y nginx certbot python3-certbot-nginx rsync

# PM2
sudo npm install -g pm2
```

---

## Phase 3: First-Time Deployment (from local machine)

```bash
# 1. Build the app
cp .env.production .env.local
npm run build
bash scripts/fix-standalone.sh   # ensures node_modules are complete in standalone

# 2. Sync to VM
rsync -avz -e "ssh -i /home/michael/Downloads/oracle.key" \
  .next/standalone/ ubuntu@84.235.239.6:~/marketplace/

rsync -avz -e "ssh -i /home/michael/Downloads/oracle.key" \
  .next/static/ ubuntu@84.235.239.6:~/marketplace/.next/static/

rsync -avz -e "ssh -i /home/michael/Downloads/oracle.key" \
  public/ ubuntu@84.235.239.6:~/marketplace/public/

rsync -avz -e "ssh -i /home/michael/Downloads/oracle.key" \
  plugins/ ubuntu@84.235.239.6:~/marketplace/plugins/

scp -i /home/michael/Downloads/oracle.key \
  .env.production nginx-unified.conf \
  scripts/boot.sh scripts/deploy-prod.sh \
  ubuntu@84.235.239.6:~/marketplace/

# 3. Fix native modules for VM's Node.js version
ssh -i /home/michael/Downloads/oracle.key ubuntu@84.235.239.6 \
  "cd ~/marketplace && npm rebuild better-sqlite3"

# 4. Start with PM2
ssh -i /home/michael/Downloads/oracle.key ubuntu@84.235.239.6 \
  "cd ~/marketplace && pm2 restart sinaicamps || pm2 start server.js --name sinaicamps && pm2 save"
```

Or use the one-command script (does all of the above):
```bash
bash scripts/deploy-sinaicamps.sh
```

### 3.1 Enable PM2 Auto-Start on Reboot (one-time)
Run on VM:
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```

---

## Phase 4: Ongoing Deployments via GitHub Actions

Push to `main` branch triggers `.github/workflows/deploy.yml` which:
1. Installs dependencies and builds the app on the CI runner
2. Runs `scripts/fix-standalone.sh` to complete node_modules
3. `rsync`s the built output to `ubuntu@84.235.239.6:~/marketplace/`
4. SSHes in and runs `scripts/deploy-prod.sh` (PM2 restart + Nginx reload)

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `ORACLE_KEY` | Contents of `/home/michael/Downloads/oracle.key` |
| `ORACLE_IP` | `84.235.239.6` |

---

## Phase 5: SSL Certificates — ⚠️ PENDING ACTION REQUIRED

SSL is blocked by Cloudflare's orange-cloud proxy. The HTTP challenge reaches Cloudflare, not the VM.

### Option A — Temporarily disable proxy (recommended, fastest)
1. Go to Cloudflare dashboard → `sinaicamps.com` zone → **DNS**
2. Click the orange cloud on **both** `@` and `api` A records → turn them **grey (DNS only)**
3. On the VM, run:
   ```bash
   sudo certbot certonly --nginx -d sinaicamps.com -d api.sinaicamps.com \
     --non-interactive --agree-tos --email admin@sinaicamps.com
   ```
4. Once certs are issued (`/etc/letsencrypt/live/sinaicamps.com/`), deploy the full Nginx config:
   ```bash
   sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
   sudo nginx -t && sudo systemctl reload nginx
   ```
5. Turn the Cloudflare proxy back to **orange** on both records
6. In Cloudflare SSL/TLS settings → set mode to **Full (Strict)**

### Option B — Cloudflare Origin Certificate (no certbot needed)
1. Cloudflare dashboard → SSL/TLS → **Origin Server** → Create Certificate
2. Include hostnames: `sinaicamps.com`, `*.sinaicamps.com`
3. Copy the certificate and key to the VM:
   ```bash
   sudo mkdir -p /etc/letsencrypt/live/sinaicamps.com
   # paste cert content:
   sudo nano /etc/letsencrypt/live/sinaicamps.com/fullchain.pem
   # paste key content:
   sudo nano /etc/letsencrypt/live/sinaicamps.com/privkey.pem
   ```
4. Deploy Nginx config and reload:
   ```bash
   sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
   sudo nginx -t && sudo systemctl reload nginx
   ```
5. Set Cloudflare SSL/TLS mode to **Full (Strict)**

---

## Phase 6: Nginx Configuration

Current active config on VM: `/etc/nginx/sites-available/sinaicamps`

After SSL is set up, the final config is at `nginx-unified.conf` in the repo root.
It handles:
- HTTP → HTTPS redirect
- `sinaicamps.com` → proxy to `localhost:3000`
- `api.sinaicamps.com` → proxy to `localhost:3000` with CORS headers

---

## Phase 7: Tenant Frontends (Cloudflare Pages)

### 7.1 Build a tenant shop frontend
```bash
bash scripts/build-shop.sh acacia production https://api.sinaicamps.com
# Output: builds/acacia/dist/
```

### 7.2 Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy builds/acacia/dist \
  --project-name acaciacamp \
  --branch main
```

### 7.3 Add custom domain
In the [Cloudflare Pages dashboard](https://dash.cloudflare.com) → project `acaciacamp` → **Custom Domains** → Add `acaciacamp.com`.
Cloudflare will auto-configure DNS and SSL.

---

## Maintenance

```bash
# SSH into VM
ssh -i /home/michael/Downloads/oracle.key ubuntu@84.235.239.6

# App status
pm2 list
pm2 logs sinaicamps --lines 50

# Restart app
pm2 restart sinaicamps

# Check health
curl http://localhost:3000/api/health

# Nginx status
sudo systemctl status nginx
sudo nginx -t

# View DB properties
node -e "
const db = require('better-sqlite3')('campops-prod-sim.db');
console.log(db.prepare('SELECT id,slug,name,custom_domain FROM properties').all());
"
```
