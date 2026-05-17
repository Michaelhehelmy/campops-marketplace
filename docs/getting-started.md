# Getting Started — Local Development

This guide gets the platform running on your local machine in under 10 minutes.

> For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10 | Bundled with Node 20 |
| Git | any | |

No database server needed — the app uses SQLite out of the box for local development.

---

## Step 1 — Clone and install

```bash
git clone https://github.com/your-org/campops-marketplace.git
cd campops-marketplace
npm install
```

---

## Step 2 — Configure environment

```bash
cp .env.example .env.local
```

Minimum required variables in `.env.local`:

```env
NODE_ENV=development
BETTER_AUTH_SECRET=any-random-32-char-string
NEXT_PUBLIC_BASE_DOMAIN=localhost
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=file:./campops-dev.db
AUTH_TRUST_HOST=true
TRUSTED_ORIGINS=http://localhost:3000
```

Generate a secret with: `openssl rand -base64 32`

---

## Step 3 — Start the dev server

```bash
npm run dev
```

Open **[http://localhost:3000/en](http://localhost:3000/en)**

The SQLite database is created automatically on first run with seed data (demo users and properties).

---

## Step 4 — Explore the platform

| URL | What you see |
|-----|-------------|
| `/en` | Public marketplace homepage |
| `/en/search` | Property search |
| `/en/login` | Login page |
| `/en/admin` | Master admin panel (master role required) |
| `/en/manage/[id]` | Property owner dashboard |
| `/en/list-your-space` | Owner self-registration |
| `/api/health` | Health check endpoint |
| `/api/branding?slug=<slug>` | Tenant branding data |

---

## Step 5 — Seed a test property (optional)

The app seeds demo properties on startup. To add your own:

```bash
node scripts/seed-property.js \
  --slug my-camp \
  --name "My Camp" \
  --domain mycamp.com
```

Or directly via the master admin UI at `/en/admin`.

---

## Step 6 — Build a tenant shop frontend (optional)

Each tenant gets a branded Vite SPA hosted separately:

```bash
bash scripts/build-shop.sh <slug> development http://localhost:3000
# Output: builds/<slug>/dist/
```

Serve it locally:
```bash
cd builds/<slug>/dist && npx serve .
```

---

## Troubleshooting

**Blank page — redirects to `/en` but nothing loads**
- Check the terminal for Next.js errors
- Verify `BETTER_AUTH_SECRET` is set

**`Invalid origin` error on login**
- Add `http://localhost:3000` to `TRUSTED_ORIGINS` in `.env.local`

**`Cannot find module 'better-sqlite3'`**
- Run `npm rebuild better-sqlite3` — native module needs to be compiled for your Node version

**Port already in use**
- Set `PORT=3001` in `.env.local` and update `NEXT_PUBLIC_APP_URL` accordingly

**`404` on `/` — expected**
- The middleware always redirects `/` → `/en`. This is correct behaviour.

---

## Next Steps

- [Customization guide](customization.md) — change branding, colors, name
- [Plugin development guide](plugin-development-guide.md) — build new plugins
- [Deployment guide](DEPLOYMENT.md) — deploy to production
