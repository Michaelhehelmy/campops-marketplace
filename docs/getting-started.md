# Getting Started

This guide walks you through running CampOps Marketplace locally from scratch — including setting up the Acacia Camp backend it depends on.

---

## Step 1 – Prerequisites

Install the following before proceeding:

| Requirement | Minimum | Notes                            |
| ----------- | ------- | -------------------------------- |
| Node.js     | 20 LTS  | [nodejs.org](https://nodejs.org) |
| npm         | 10      | Bundled with Node 20             |
| PostgreSQL  | 15      | Used by the Acacia Camp backend  |
| Git         | any     |                                  |

---

## Step 2 – Clone the repository

```bash
git clone https://github.com/your-org/campops-marketplace.git
cd campops-marketplace
```

---

## Step 3 – Install dependencies

```bash
npm install
```

---

## Step 4 – Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and set at minimum:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BASE_DOMAIN=localhost
```

If you are connecting to a real Acacia Camp instance, set `NEXT_PUBLIC_API_URL` to its public address.

---

## Step 5 – Start the Acacia Camp backend (required)

The Marketplace is a frontend app — it needs the Express API to serve property data, handle bookings, and authenticate users.

Clone and start the backend:

```bash
git clone https://github.com/your-org/acacia-camp.git
cd acacia-camp
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET
npm install
npx tsx server/scripts/migrate-phase8.ts   # run all migrations
npm run dev:server                          # starts on http://localhost:5000
```

See [integrating-acacia-camp.md](integrating-acacia-camp.md) for full instructions.

---

## Step 6 – Run the Marketplace

Back in the `campops-marketplace` directory:

```bash
npm run dev
```

Open your browser at **[http://localhost:3001/en](http://localhost:3001/en)**.

---

## Step 7 – Explore the app

| URL                   | What you see                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `/en/search`          | Property search                                                  |
| `/en/stay/:slug`      | Property detail page                                             |
| `/en/book`            | Booking flow                                                     |
| `/en/list-your-camp`  | Owner registration (Step 1)                                      |
| `/en/owner/dashboard` | Basic-plan owner dashboard                                       |
| `/admin`              | Full operations panel (requires premium plan + Vite SPA running) |

---

## Troubleshooting

**Blank page / no properties showing**

- Confirm `NEXT_PUBLIC_API_URL` is correct and the backend is running.
- Open browser DevTools → Network tab → look for failed `/api/public/properties` requests.

**`404` on `/en` after fresh start**

- Ensure you are visiting `/en` not just `/`. The middleware always redirects to a locale-prefixed path.

**`NEXT_PUBLIC_BASE_DOMAIN` — when should I set this?**

- Only matters when running behind a real domain with subdomain routing (e.g. `campname.campops.com`). Leave it as `localhost` for local development.

**Hot reload not working**

- Ensure you are using Node 20+. Older versions have issues with Next.js 14 file watching.
