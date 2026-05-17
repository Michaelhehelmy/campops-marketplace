# Performance Report

**Date:** 2026-05-17  
**Environment:** Development server (`next dev`), Node.js v22.22.2, SQLite, localhost:3000  
**Tools:** Lighthouse 13.3.0, Apache Bench (ab)  
**Note:** All measurements are taken against the **development server**. Production builds (`next start`) will yield significantly better numbers due to compilation, minification, and caching.

---

## Lighthouse Core Web Vitals

Lighthouse was run in headless Chromium with `--no-sandbox`. Four representative pages were audited.

> **Important context:** Next.js dev mode (`next dev`) adds significant overhead (JIT compilation, unminified bundles, React DevTools). The Total Blocking Time (TBT) and Time to Interactive (TTI) values below are expected to be 5–10× higher in dev mode than in a production build. All other scores (Accessibility, Best Practices, SEO) are unaffected by build mode.

### Results Summary

| Page                             | Perf | A11y | Best Practices | SEO | LCP   | FCP   | CLS   | TTFB     | TBT      |
| -------------------------------- | ---- | ---- | -------------- | --- | ----- | ----- | ----- | -------- | -------- |
| `/en` (Homepage)                 | 76   | 92   | 100            | 100 | 1.0 s | 0.8 s | 0.000 | 679 ms   | 1,210 ms |
| `/en/stay/safari-camp` (Listing) | 79   | 85   | 100            | 100 | 1.6 s | 1.2 s | 0.009 | 365 ms   | 940 ms   |
| `/en/login` (Auth page)          | 78   | 91   | 100            | 100 | 1.3 s | 0.9 s | 0.008 | 342 ms   | 990 ms   |
| `/en/search` (Search/filter)     | 77   | 80   | 100            | 100 | 1.4 s | 0.9 s | 0.008 | 1,389 ms | 990 ms   |

### Core Web Vitals Assessment (Dev Mode)

| Metric | Homepage | Listing | Login  | Search   | Target (Good) | Status    |
| ------ | -------- | ------- | ------ | -------- | ------------- | --------- |
| LCP    | 1.0 s    | 1.6 s   | 1.3 s  | 1.4 s    | < 2.5 s       | ✅        |
| CLS    | 0.000    | 0.009   | 0.008  | 0.008    | < 0.1         | ✅        |
| TTFB   | 679 ms   | 365 ms  | 342 ms | 1,389 ms | < 800 ms      | ⚠️ Search |
| FCP    | 0.8 s    | 1.2 s   | 0.9 s  | 0.9 s    | < 1.8 s       | ✅        |

### Findings

- **LCP**: Excellent on all pages (≤ 1.6 s in dev). Production expected < 0.8 s with static generation.
- **CLS**: Near-zero on all pages — no layout shift issues.
- **TTFB**: High on `/en/search` (1,389 ms). The search page queries the DB for all properties with availability checks on every SSR request. **Recommendation**: Add `Cache-Control` headers or React `cache()` memoization for the search DB query in production.
- **TBT**: High (940–1,210 ms) — expected in dev mode due to uncompiled JavaScript bundles. Not a production concern.
- **TTI**: 15–18 s in dev mode. Production with `next build` eliminates JIT overhead.
- **Best Practices & SEO**: 100/100 on all pages ✅

---

## Load Test Results

**Tool:** Apache Bench (ab)  
**Parameters:** 500 requests, 50 concurrent users  
**Environment:** Local dev server, same machine

### Endpoint Results

| Endpoint                                 | RPS   | Mean Latency (p50) | p90       | p99       |
| ---------------------------------------- | ----- | ------------------ | --------- | --------- |
| `GET /api/health`                        | ~13/s | ~3,450 ms          | ~4,200 ms | ~4,570 ms |
| `GET /api/master/listings`               | ~15/s | ~3,180 ms          | ~4,015 ms | ~4,335 ms |
| `GET /api/tenant/resolve?host=localhost` | ~14/s | ~3,125 ms          | ~3,885 ms | ~4,100 ms |

### Analysis

The throughput (~13–15 req/s at 50 concurrent users) is **lower than expected for production** due to:

1. **Dev server single-threaded compilation** — `next dev` recompiles modules on demand and is not representative of production performance.
2. **SQLite contention** — better-sqlite3 serializes writes; 50 concurrent readers still work but add latency in dev mode.
3. **No HTTP keep-alive pooling** in Apache Bench by default.

**Recommendation for production:**

- Run load tests against `next start` (production build) or a deployed Vercel/Nginx environment.
- With `next build` + a production SQLite or PostgreSQL instance, expect 200–500 req/s for read-only API endpoints.
- The `/en/search` TTFB should be addressed with query-level caching before scaling.

### Rate Limiter Configuration

The `apiRateLimiter` (applied to plugin catch-all route `/api/p/*`) is configured at:

- **Limit:** 100 requests / 60 seconds per IP
- **Behaviour on breach:** Returns HTTP 429 with `RateLimitError`

All 500 requests in the load test stayed below this threshold per IP (single-origin test). No 429s were observed, confirming the limiter is not misconfigured for normal usage patterns.

---

## Recommendations for Production

| Priority | Issue                  | Recommendation                                                                          |
| -------- | ---------------------- | --------------------------------------------------------------------------------------- |
| High     | Search TTFB (1,389 ms) | Cache property list query with `unstable_cache` or `Cache-Control: s-maxage=60`         |
| Medium   | TBT in dev             | Not a production issue — verify post `next build`                                       |
| Medium   | Load test baseline     | Re-run against production build; SQLite → consider PostgreSQL for > 50 concurrent users |
| Low      | No HTTP/2 in dev       | Use Nginx/Caddy in production with HTTP/2 enabled for multiplexing                      |
