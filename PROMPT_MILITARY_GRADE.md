# OpenCode Agent Prompt: Military-Grade Maintenance Implementation

## Executive Summary

Implement all 7 phases of the military-grade maintenance hardening plan for the SinaiCamps multi-tenant marketplace. This covers zero-downtime operations, full observability, database resilience, security hardening, incident response, chaos testing, and ongoing maintenance automation.

**Infrastructure:** Single VPS, PM2, Nginx, SQLite (WAL mode), Cloudflare  
**Stack:** Next.js 14 App Router, TypeScript, Better Auth, Drizzle ORM

**DO NOT touch plugin code.** All changes are scoped to the core platform only.

---

## Pre-Flight Checklist

Before starting, read:
- `AGENT_LOGBOOK.md` — recent changes and gotchas
- `ecosystem.config.js` — current PM2 config
- `nginx-unified.conf` — current Nginx config
- `src/lib/metrics.ts` — current in-memory metrics
- `src/middleware.ts` — current middleware
- `.github/workflows/deploy.yml` — current CI/CD pipeline

Run tests first:
```bash
npm test
```
All 1159 tests must pass before and after your changes.

---

## Phase 1 — Zero-Downtime Operations

**Agent:** @devops  
**Priority:** CRITICAL — implement first  
**Estimated time:** 2-3 hours

### 1.1 Update PM2 to Cluster Mode

**File:** `ecosystem.config.js`

Replace entire file contents with:
```js
/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'sinaicamps',
      script: 'server.js',
      cwd: '/home/ubuntu/marketplace',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '800M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
      },
      kill_timeout: 30000,
      wait_ready: true,
      listen_timeout: 60000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      shutdown_with_message: true,
    },
  ],
};
```

### 1.2 Create Health Check Script

**File:** `scripts/health-check.sh` (new file)

```bash
#!/bin/bash
# Post-deploy health check
# Usage: bash scripts/health-check.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-https://sinaicamps.com}"
MAX_ATTEMPTS=15
SLEEP_SECONDS=5
FAILED_ATTEMPTS=0

echo "▶ Running health check against $BASE_URL"

for i in $(seq 1 $MAX_ATTEMPTS); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    --retry 0 \
    "$BASE_URL/api/health" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed (attempt $i, HTTP $HTTP_CODE)"
    exit 0
  fi

  echo "⏳ Attempt $i/$MAX_ATTEMPTS — HTTP $HTTP_CODE, retrying in ${SLEEP_SECONDS}s..."
  sleep $SLEEP_SECONDS
done

echo "❌ Health check FAILED after $MAX_ATTEMPTS attempts"
exit 1
```

Make executable: `chmod +x scripts/health-check.sh`

### 1.3 Add Rollback to Deploy Script

**File:** `scripts/deploy-prod.sh`

Read the current file first, then add a rollback block after `pm2 reload`. The updated file should include:

```bash
#!/bin/bash
set -euo pipefail

echo "[deploy] Reloading PM2..."

# Save current process list as rollback point
pm2 save

# Perform zero-downtime reload
pm2 reload sinaicamps --update-env

echo "[deploy] Waiting for health check..."
sleep 8

# Verify deployment succeeded
if ! bash "$(dirname "$0")/health-check.sh" "${BASE_URL:-https://sinaicamps.com}"; then
  echo "❌ [deploy] Health check failed — rolling back..."
  pm2 restart sinaicamps --update-env
  sleep 5
  if bash "$(dirname "$0")/health-check.sh" "${BASE_URL:-https://sinaicamps.com}"; then
    echo "⚠️  [deploy] Rollback succeeded — previous version restored"
  else
    echo "❌ [deploy] Rollback also failed — manual intervention required"
    exit 2
  fi
  exit 1
fi

pm2 save
echo "✅ [deploy] Deployment successful"
```

### 1.4 Fix CI Lint/Type-Check

**File:** `.github/workflows/ci.yml`

Remove `continue-on-error: true` from the lint and type-check steps:

```yaml
- name: Run linter
  run: npm run lint

- name: Run type check
  run: npm run type-check
```

Also add post-deploy health check step to `.github/workflows/deploy.yml` after the SSH deploy command:

```yaml
- name: Post-deploy health check
  run: |
    for i in {1..15}; do
      HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://sinaicamps.com/api/health)
      [ "$HTTP" = "200" ] && echo "✅ Health check passed" && exit 0
      echo "Attempt $i: HTTP $HTTP, retrying..."
      sleep 5
    done
    echo "❌ Health check failed" && exit 1
```

### 1.5 Nginx Upstream Timeout Guards

**File:** `nginx-unified.conf`

Add inside the HTTPS `server {}` block, before the `location` blocks:

```nginx
# Upstream timeouts — prevent hanging connections
proxy_connect_timeout 5s;
proxy_read_timeout 30s;
proxy_send_timeout 30s;
proxy_next_upstream error timeout http_500 http_502 http_503 http_504;
```

### Verification (Phase 1)
```bash
npm test                    # must still pass
pm2 describe sinaicamps     # should show exec_mode: cluster
curl https://sinaicamps.com/api/health  # must return 200
```

---

## Phase 2 — Observability Stack

**Agent:** @devops + @backend_architect  
**Priority:** HIGH  
**Estimated time:** 4-6 hours

### 2.1 Replace In-Memory Metrics with Prometheus Client

**File:** `package.json` — add dependency:
```json
"prom-client": "^15.1.3"
```

**File:** `src/lib/metrics.ts` — replace entire file:

```typescript
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry, prefix: 'sinaicamps_node_' });

export const httpRequestsTotal = new Counter({
  name: 'sinaicamps_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path'],
  registers: [registry],
});

export const httpDurationMs = new Histogram({
  name: 'sinaicamps_http_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'status', 'path'],
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

export const csrfBlockedTotal = new Counter({
  name: 'sinaicamps_csrf_blocked_total',
  help: 'Total CSRF-blocked requests',
  registers: [registry],
});

export const rateLimitHitsTotal = new Counter({
  name: 'sinaicamps_rate_limit_hits_total',
  help: 'Total rate limit rejections',
  labelNames: ['zone'],
  registers: [registry],
});

export const tenantResolveErrorsTotal = new Counter({
  name: 'sinaicamps_tenant_resolve_errors_total',
  help: 'Tenant resolution failures',
  registers: [registry],
});

export const authFailuresTotal = new Counter({
  name: 'sinaicamps_auth_failures_total',
  help: 'Authentication failures',
  labelNames: ['reason'],
  registers: [registry],
});

export const dbQueryDurationMs = new Histogram({
  name: 'sinaicamps_db_query_duration_ms',
  help: 'Database query duration',
  labelNames: ['operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [registry],
});

// Legacy compatibility — keep these for existing callers
export function incrementCounter(name: string, by = 1) {
  // no-op: replaced by prom-client counters above
}
export function recordHistogram(name: string, value: number) {
  if (name === 'response_time_ms') {
    httpDurationMs.observe({ method: '', status: '', path: '' }, value);
  }
}
export function getMetrics() {
  return {};
}
export function resetMetrics() {}
```

### 2.2 Expose Prometheus Metrics Endpoint

**File:** `src/app/api/metrics/route.ts` (new file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { registry } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const expectedToken = process.env.METRICS_TOKEN;

  if (expectedToken && token !== expectedToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const metrics = await registry.metrics();
  return new NextResponse(metrics, {
    status: 200,
    headers: { 'Content-Type': registry.contentType },
  });
}
```

### 2.3 Add Metrics to Middleware

**File:** `src/middleware.ts`

After the existing imports, update the `middleware` function to record real metrics. In the `middleware` function body, replace the `incrementCounter` and `recordHistogram` calls:

```typescript
// After: const duration = Date.now() - startTime;
import { httpRequestsTotal, httpDurationMs, csrfBlockedTotal } from '@/lib/metrics';

// In the middleware function, after response is built:
const statusCode = response.status;
const pathKey = pathname.split('/').slice(0, 3).join('/'); // collapse paths
httpRequestsTotal.inc({ method, status: String(statusCode), path: pathKey });
httpDurationMs.observe({ method, status: String(statusCode), path: pathKey }, duration);
```

### 2.4 Create Prometheus Configuration

**File:** `prometheus.yml` (new file in project root)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    app: sinaicamps
    environment: production

scrape_configs:
  - job_name: sinaicamps
    scheme: https
    metrics_path: /api/metrics
    bearer_token_file: /etc/prometheus/metrics-token
    static_configs:
      - targets: ['sinaicamps.com']
    tls_config:
      insecure_skip_verify: false

  - job_name: node_exporter
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alerts/*.yml'
```

### 2.5 Create AlertManager Configuration

**File:** `alertmanager.yml` (new file in project root)

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      repeat_interval: 1h

receivers:
  - name: 'default'
    webhook_configs:
      - url: '${ALERT_WEBHOOK_URL}'
        send_resolved: true

  - name: 'critical'
    webhook_configs:
      - url: '${ALERT_WEBHOOK_URL}'
        send_resolved: true
```

### 2.6 Create Alert Rules

**File:** `alerts/sinaicamps.yml` (new directory + file)

```yaml
groups:
  - name: sinaicamps_platform
    rules:
      - alert: AppDown
        expr: up{job="sinaicamps"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "SinaiCamps application is down"
          description: "The application has been unreachable for 1 minute."

      - alert: HighErrorRate
        expr: |
          rate(sinaicamps_http_requests_total{status=~"5.."}[5m])
          / rate(sinaicamps_http_requests_total[5m]) > 0.02
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 2%"
          description: "HTTP 5xx error rate is {{ $value | humanizePercentage }} over last 5m."

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            rate(sinaicamps_http_duration_ms_bucket[5m])
          ) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency above 1000ms"
          description: "95th percentile response time is {{ $value }}ms."

      - alert: HighRateLimitHits
        expr: rate(sinaicamps_rate_limit_hits_total[5m]) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High rate limit activity"
          description: "Rate limiter is blocking {{ $value }} req/s — possible DDoS."

      - alert: HighAuthFailures
        expr: rate(sinaicamps_auth_failures_total[5m]) > 2
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High authentication failure rate"
          description: "Auth failures at {{ $value }} per second — possible brute force."

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes{job="sinaicamps"} > 838860800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage (>800MB)"
          description: "App memory is {{ $value | humanize }} — PM2 restart threshold near."
```

### 2.7 Docker Compose for Monitoring Sidecar

**File:** `docker-compose.monitoring.yml` (new file in project root)

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: sinaicamps-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./alerts:/etc/prometheus/alerts:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - '127.0.0.1:9090:9090'  # localhost only — access via SSH tunnel
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:10.4.0
    container_name: sinaicamps-grafana
    restart: unless-stopped
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_SERVER_HTTP_ADDR=127.0.0.1
      - GF_ANALYTICS_REPORTING_ENABLED=false
    ports:
      - '127.0.0.1:3001:3000'  # localhost only — access via SSH tunnel
    networks:
      - monitoring
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: sinaicamps-alertmanager
    restart: unless-stopped
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    ports:
      - '127.0.0.1:9093:9093'
    networks:
      - monitoring

  node_exporter:
    image: prom/node-exporter:v1.8.0
    container_name: sinaicamps-node-exporter
    restart: unless-stopped
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - '127.0.0.1:9100:9100'
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  monitoring:
    driver: bridge
```

### 2.8 Configure PM2 Log Rotation

**File:** `scripts/setup-pm2-logrotate.sh` (new file)

```bash
#!/bin/bash
# Install and configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
pm2 set pm2-logrotate:rotateModule true
echo "PM2 log rotation configured"
```

### 2.9 Add `METRICS_TOKEN` to `.env.example`

**File:** `.env.example` — append:
```env
# Prometheus metrics endpoint token
METRICS_TOKEN=your-secure-random-token-here
# Grafana admin password
GRAFANA_ADMIN_PASSWORD=your-secure-grafana-password
# Alert webhook (Telegram/Slack/PagerDuty)
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
```

### Verification (Phase 2)
```bash
npm test                          # must still pass
curl http://localhost:3000/api/metrics -H "Authorization: Bearer $METRICS_TOKEN"
# Should return Prometheus text format with sinaicamps_* metrics
```

---

## Phase 3 — Database Resilience

**Agent:** @db_architect  
**Priority:** HIGH  
**Estimated time:** 2-3 hours

### 3.1 SQLite WAL Pragma Tuning

**File:** `src/lib/db.ts`

After the existing `getSqlite().pragma('busy_timeout = 10000')` and `synchronous = NORMAL` lines, add:

```typescript
getSqlite().pragma('wal_autocheckpoint = 1000');  // checkpoint every 1000 pages
getSqlite().pragma('cache_size = -65536');          // 64MB in-memory page cache
getSqlite().pragma('temp_store = MEMORY');          // temp tables in RAM
getSqlite().pragma('mmap_size = 268435456');        // 256MB memory-mapped I/O
getSqlite().pragma('foreign_keys = ON');            // enforce FK constraints
getSqlite().pragma('optimize');                     // analyze query planner stats
```

### 3.2 Backup Integrity Verification

**File:** `scripts/backup-db.sh`

After the SQLite backup section (after the `echo "SQLite backup successfully completed"` line), add:

```bash
# Verify backup integrity
echo "Verifying backup integrity..."
INTEGRITY=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check" 2>&1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "❌ BACKUP INTEGRITY CHECK FAILED: $INTEGRITY" >&2
  # Send alert
  if [ -n "${ALERT_EMAIL:-}" ]; then
    echo "SinaiCamps backup integrity check FAILED on $(hostname) at $(date)" | \
      mail -s "🚨 BACKUP FAILURE: sinaicamps.db" "$ALERT_EMAIL" 2>/dev/null || true
  fi
  # Don't delete the bad backup — keep for investigation
  exit 1
fi
echo "✅ Backup integrity check passed"
```

Change backup retention from 10 to 30:
```bash
# Change: tail -n +11
# To:
ls -tp "$BACKUPS_DIR"/backup-* 2>/dev/null | tail -n +31 | xargs -I {} rm -- {} || true
```

### 3.3 Create Restore Test Script

**File:** `scripts/test-restore.sh` (new file)

```bash
#!/bin/bash
# Monthly backup restore verification
# Tests that the most recent backup can be restored and queried
set -euo pipefail

BACKUPS_DIR="${BACKUPS_DIR:-backups}"
TEST_DB="/tmp/sinaicamps-restore-test-$$.db"

echo "▶ SinaiCamps Backup Restore Test — $(date)"

# Find most recent backup
LATEST=$(ls -t "$BACKUPS_DIR"/backup-*.db 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "❌ No backup files found in $BACKUPS_DIR" >&2
  exit 1
fi

echo "Testing backup: $LATEST ($(du -h "$LATEST" | cut -f1))"

# Copy to test location
cp "$LATEST" "$TEST_DB"

# Integrity check
echo "Running integrity check..."
INTEGRITY=$(sqlite3 "$TEST_DB" "PRAGMA integrity_check" 2>&1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "❌ Integrity check FAILED: $INTEGRITY" >&2
  rm -f "$TEST_DB"
  exit 1
fi

# Critical table queries
echo "Running critical table queries..."
TABLES=("users" "properties" "sites" "sessions" "audit_logs")
for TABLE in "${TABLES[@]}"; do
  COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM $TABLE" 2>/dev/null || echo "ERROR")
  if [ "$COUNT" = "ERROR" ]; then
    echo "⚠️  Table $TABLE: query failed (may not exist)"
  else
    echo "  ✅ $TABLE: $COUNT rows"
  fi
done

# Foreign key check
echo "Running foreign key check..."
FK_ISSUES=$(sqlite3 "$TEST_DB" "PRAGMA foreign_key_check" 2>&1)
if [ -n "$FK_ISSUES" ]; then
  echo "⚠️  Foreign key issues found: $FK_ISSUES"
else
  echo "  ✅ Foreign keys: OK"
fi

# Cleanup
rm -f "$TEST_DB"

echo "✅ Restore test PASSED — backup is healthy"
echo "Backup: $LATEST"
echo "Test completed: $(date)"
```

Make executable: `chmod +x scripts/test-restore.sh`

### 3.4 Crontab Setup Script

**File:** `scripts/setup-cron.sh` (new file)

```bash
#!/bin/bash
# Set up production cron jobs
PROJ="/home/ubuntu/marketplace"

# Backup at 2am daily
(crontab -l 2>/dev/null; echo "0 2 * * * bash $PROJ/scripts/backup-db.sh >> $PROJ/logs/backup.log 2>&1") | crontab -

# S3 upload at 2:10am daily
(crontab -l 2>/dev/null; echo "10 2 * * * bash $PROJ/scripts/backup-s3.sh >> $PROJ/logs/backup.log 2>&1") | crontab -

# SSL renewal check monthly
(crontab -l 2>/dev/null; echo "0 4 1 * * bash $PROJ/scripts/renew-ssl.sh >> $PROJ/logs/ssl.log 2>&1") | crontab -

# Monthly restore test
(crontab -l 2>/dev/null; echo "0 5 1 * * bash $PROJ/scripts/test-restore.sh >> $PROJ/logs/restore-test.log 2>&1") | crontab -

echo "✅ Cron jobs installed:"
crontab -l
```

Make executable: `chmod +x scripts/setup-cron.sh`

### Verification (Phase 3)
```bash
npm test                              # must still pass
bash scripts/backup-db.sh            # should produce integrity-checked backup
bash scripts/test-restore.sh         # should pass all checks
```

---

## Phase 4 — Security Hardening

**Agent:** @security  
**Priority:** HIGH  
**Estimated time:** 3-4 hours

### 4.1 Fix Role Cookie — Add HMAC Signing

**Current problem:** `sinaicamps_role` is a plain non-httpOnly cookie read at `src/middleware.ts:204`. This can be tampered by the user.

**File:** `src/lib/cookie-signing.ts` (new file)

```typescript
import { createHmac } from 'crypto';

const COOKIE_SECRET = process.env.COOKIE_SIGNING_SECRET || process.env.BETTER_AUTH_SECRET || 'fallback-dev-only';

export function signValue(value: string): string {
  const sig = createHmac('sha256', COOKIE_SECRET)
    .update(value)
    .digest('base64url');
  return `${value}.${sig}`;
}

export function verifySignedValue(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const value = signed.substring(0, lastDot);
  const expectedSigned = signValue(value);
  if (signed !== expectedSigned) return null;
  return value;
}
```

**File:** `src/middleware.ts`

1. Import the new helper at the top:
```typescript
import { verifySignedValue } from '@/lib/cookie-signing';
```

2. Replace the raw cookie read:
```typescript
// BEFORE:
const userRole = req.cookies.get('sinaicamps_role')?.value;

// AFTER:
const rawRoleCookie = req.cookies.get('sinaicamps_role')?.value;
const userRole = rawRoleCookie ? verifySignedValue(rawRoleCookie) : undefined;
```

3. Add `COOKIE_SIGNING_SECRET` to `.env.example`:
```env
# HMAC key for role cookie signing — must be 32+ random chars
COOKIE_SIGNING_SECRET=generate-with-openssl-rand-base64-32
```

**Note:** Existing sessions with unsigned role cookies will have `userRole = null` and fall through to the DB check — this is safe. Inform users they may need to re-login after deployment.

### 4.2 Tighten Content Security Policy

**File:** `src/middleware.ts`

Update the `withSecurityHeaders` function to use a per-request nonce for scripts:

```typescript
function withSecurityHeaders(res: Response | NextResponse, nonce?: string): NextResponse {
  const response = res as NextResponse;
  const isProd = process.env.NODE_ENV === 'production';
  const connectSrc = isProd
    ? 'https://*.sinaicamps.com'
    : 'https://*.sinaicamps.com http://localhost:3001 http://127.0.0.1:3001';

  // Use nonce if available; fall back to 'unsafe-inline' for non-page requests
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' https://challenges.cloudflare.com https://static.cloudflareinsights.com`
    : `'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com`;

  response.headers.set(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src ${scriptSrc}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: https:`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `frame-src 'self' https://challenges.cloudflare.com`,
      `connect-src 'self' https://static.cloudflareinsights.com ${connectSrc}`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; ')
  );

  // Additional hardening headers
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}
```

### 4.3 Add Rate Limiting to Plugin Routes

**File:** `src/middleware.ts`

In the `RATE_LIMITED_PREFIXES` array, add:
```typescript
'/api/p/',           // all plugin routes
'/api/tenant/',      // tenant resolution endpoint
```

### 4.4 Add Security Audit to CI

**File:** `.github/workflows/ci.yml`

Add after the test step:
```yaml
- name: Security audit
  run: npm audit --audit-level=high
  continue-on-error: false
```

### 4.5 Add Dependabot Configuration

**File:** `.github/dependabot.yml` (new file)

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "09:00"
    open-pull-requests-limit: 5
    labels:
      - dependencies
      - security
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

### 4.6 Create Secret Rotation Runbook

**File:** `runbooks/secret-rotation.md` (new file — create `runbooks/` directory)

```markdown
# Secret Rotation Runbook

## Schedule
All secrets should be rotated every 90 days. Set a calendar reminder.

## Secrets Inventory

| Secret | Location | Rotation Impact | Last Rotated |
|--------|----------|----------------|--------------|
| BETTER_AUTH_SECRET | .env.production | Invalidates all active sessions | — |
| COOKIE_SIGNING_SECRET | .env.production | Users need to re-login | — |
| CLOUDFLARE_API_TOKEN | .env.production + GitHub Secrets | None if done atomically | — |
| STRIPE_SECRET_KEY | .env.production + GitHub Secrets | None if done atomically | — |
| METRICS_TOKEN | .env.production | Prometheus scrape pauses briefly | — |

## Rotation Procedure

### BETTER_AUTH_SECRET
1. Generate new secret: `openssl rand -base64 48`
2. Schedule maintenance window (users will be logged out)
3. Update `.env.production` on server
4. `pm2 reload sinaicamps`
5. Announce to users

### CLOUDFLARE_API_TOKEN
1. In Cloudflare dashboard → My Profile → API Tokens → Create New Token
2. Update GitHub Secret `CLOUDFLARE_API_TOKEN`
3. Update `.env.production` on server
4. Delete old token in Cloudflare dashboard
5. Trigger a test deployment to verify

### STRIPE_SECRET_KEY
Follow Stripe's official key rotation guide.
Never commit to git. Update GitHub Secrets and `.env.production` atomically.
```

### Verification (Phase 4)
```bash
npm test                    # must still pass
npm audit --audit-level=high  # should show 0 high/critical
# Verify CSP header:
curl -I https://sinaicamps.com | grep -i content-security-policy
```

---

## Phase 5 — SLO Definitions & Incident Runbooks

**Agent:** @devops  
**Priority:** MEDIUM  
**Estimated time:** 2 hours

### 5.1 Create SLO Definition Document

**File:** `SLO.md` (new file in project root)

```markdown
# SinaiCamps — Service Level Objectives

Last updated: 2024-Q2  
Owner: @devops

## SLO Definitions

### Availability SLO
- **Target:** 99.9% monthly (≤ 43.8 minutes downtime/month)
- **Measurement:** External uptime monitor pinging `/api/health` every 60s
- **Alert threshold:** < 99.5% in any 1-hour window

### Latency SLO
- **Target:** p95 HTTP response time < 500ms
- **Alert threshold:** p95 > 1000ms sustained for 5 minutes

### Error Rate SLO
- **Target:** HTTP 5xx rate < 0.5% of all requests
- **Alert threshold:** > 2% for 2 consecutive minutes

### Authentication SLO
- **Target:** Auth failure rate < 1% of auth attempts
- **Alert threshold:** > 5% for 1 minute (possible brute force)

## Error Budget

| Period | Total Minutes | 99.9% Budget | Used | Remaining |
|--------|--------------|-------------|------|-----------|
| Monthly | 43,200 | 43.2 min | — | — |
| Weekly | 10,080 | 10.1 min | — | — |

## SLO Review Cadence
- Review monthly in AGENT_LOGBOOK.md
- Alert if error budget is > 50% consumed before mid-month
```

### 5.2 Create Incident Runbooks

**File:** `runbooks/app-crash.md`

```markdown
# Runbook: Application Crash

## Symptoms
- PM2 shows process in 'errored' state
- `/api/health` returning non-200
- Uptime monitor alert triggered

## Immediate Response (< 5 min)

1. Check PM2 status:
   ```bash
   pm2 status
   pm2 logs sinaicamps --lines 50
   ```

2. If errored — attempt restart:
   ```bash
   pm2 restart sinaicamps
   ```

3. Check health:
   ```bash
   curl https://sinaicamps.com/api/health
   ```

4. If still failing — check recent deploy:
   ```bash
   pm2 list  # check uptime
   git log --oneline -5  # what changed?
   ```

5. Rollback if recent deploy caused it:
   ```bash
   bash scripts/rollback.sh
   ```

## Post-Incident
- Document in AGENT_LOGBOOK.md
- Root cause analysis within 24h
- Update this runbook if needed
```

**File:** `runbooks/db-lock.md`

```markdown
# Runbook: Database Lock / High Contention

## Symptoms
- Logs show `SQLITE_BUSY` or `busy_timeout exceeded`
- API returning 500 errors on write operations
- High `db_query_duration_ms` in Grafana

## Immediate Response

1. Check if WAL checkpoint is stuck:
   ```bash
   sqlite3 sinaicamps.db "PRAGMA wal_checkpoint(PASSIVE)"
   ```

2. Check WAL file size:
   ```bash
   ls -lh sinaicamps.db-wal
   ```

3. If WAL > 100MB — force checkpoint:
   ```bash
   sqlite3 sinaicamps.db "PRAGMA wal_checkpoint(TRUNCATE)"
   ```

4. If still locked — check for hanging connections:
   ```bash
   pm2 logs sinaicamps --lines 100 | grep -i "busy\|lock\|sqlite"
   ```

5. Last resort — graceful restart:
   ```bash
   pm2 reload sinaicamps --update-env
   ```

## Long-Term Fix
If this happens frequently, migrate to PostgreSQL using `scripts/migrate-to-pg.sh`.
```

**File:** `runbooks/high-memory.md`

```markdown
# Runbook: High Memory / OOM

## Symptoms
- PM2 `max_memory_restart` triggered (800MB threshold)
- Node process exits with SIGTERM from PM2

## Immediate Response

1. Check memory usage:
   ```bash
   pm2 monit
   free -h
   ```

2. If PM2 restarted automatically — verify recovery:
   ```bash
   curl https://sinaicamps.com/api/health
   pm2 status
   ```

3. If manual restart needed:
   ```bash
   pm2 reload sinaicamps --update-env
   ```

4. Identify memory leak source:
   ```bash
   pm2 logs sinaicamps --lines 200 | grep -i "heap\|memory\|oom"
   ```

## Long-Term Fix
- Profile with `--inspect` flag in staging
- Check for unbounded in-memory cache growth in `src/lib/cache.ts`
- Review plugin hook registrations for memory leaks
```

**File:** `runbooks/ddos-response.md`

```markdown
# Runbook: DDoS / Traffic Spike Response

## Symptoms
- Nginx rate limit zone saturated
- High `sinaicamps_rate_limit_hits_total` in Grafana
- Server CPU/bandwidth spike

## Immediate Response

1. Identify top offending IPs:
   ```bash
   tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
   ```

2. Block at Nginx level:
   ```bash
   # Add to nginx-unified.conf in server block:
   deny 1.2.3.4;
   ```

3. Or block at firewall:
   ```bash
   ufw deny from 1.2.3.4
   ```

4. Enable Cloudflare Under Attack Mode in Cloudflare dashboard

5. Tighten rate limits temporarily:
   ```nginx
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;  # reduce from 30
   ```
   Then: `nginx -s reload`

## Post-Incident
- Review Cloudflare WAF rules
- Consider enabling Cloudflare Bot Fight Mode
- Document IP ranges for permanent block list
```

**File:** `runbooks/deploy-rollback.md`

```markdown
# Runbook: Emergency Deploy Rollback

## Trigger
- Post-deploy health check failed
- Users reporting broken functionality after deploy

## Rollback Steps

1. Check current deploy status:
   ```bash
   pm2 status
   pm2 logs sinaicamps --lines 30
   ```

2. Run automated rollback:
   ```bash
   bash scripts/rollback.sh
   ```

3. Verify:
   ```bash
   curl https://sinaicamps.com/api/health
   pm2 status
   ```

4. If rollback script unavailable — manual restore from previous build:
   ```bash
   # On VPS:
   cd /home/ubuntu
   ls -lt marketplace-backup-* | head -5  # find most recent backup
   pm2 stop sinaicamps
   cp -r marketplace marketplace-broken-$(date +%Y%m%d%H%M%S)
   cp -r marketplace-backup-YYYYMMDD marketplace
   pm2 start sinaicamps
   ```

5. Notify team and create incident ticket.
```

**File:** `runbooks/tenant-breach.md`

```markdown
# Runbook: Potential Cross-Tenant Data Breach

## Symptoms
- Audit log showing user accessing another tenant's data
- Tenant complaining about seeing another tenant's data
- Anomalous query patterns in DB logs

## Immediate Response

1. Query audit logs for cross-tenant access:
   ```bash
   sqlite3 sinaicamps.db \
     "SELECT * FROM audit_logs WHERE details LIKE '%cross_tenant%' ORDER BY created_at DESC LIMIT 50"
   ```

2. Identify affected user and tenant:
   ```bash
   sqlite3 sinaicamps.db \
     "SELECT u.email, a.* FROM audit_logs a JOIN users u ON a.user_id = u.id
      WHERE a.property_id != (SELECT property_id FROM property_staff WHERE user_id = a.user_id LIMIT 1)
      ORDER BY a.created_at DESC LIMIT 20"
   ```

3. If breach confirmed — immediately revoke user's session:
   ```bash
   sqlite3 sinaicamps.db "DELETE FROM sessions WHERE user_id = 'USER_ID'"
   ```

4. Preserve all evidence (do NOT delete audit logs).

5. Contact affected tenants immediately.

6. Conduct full audit of what data was accessed.
```

### Verification (Phase 5)
```bash
# Check all runbooks exist
ls runbooks/
# Verify SLO.md is created
cat SLO.md | head -5
```

---

## Phase 6 — Chaos Testing & Resilience

**Agent:** @qa  
**Priority:** MEDIUM  
**Estimated time:** 2-3 hours

### 6.1 Create Chaos Test Script

**File:** `scripts/chaos-test.sh` (new file)

```bash
#!/bin/bash
# SinaiCamps Chaos Engineering Tests
# Run monthly on staging environment
# Usage: bash scripts/chaos-test.sh [BASE_URL]
#
# WARNING: Do NOT run on production without coordination.

set -uo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
SKIP=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  echo -n "  Testing: $name ... "
  if eval "$cmd" > /tmp/chaos_out 2>&1; then
    local actual
    actual=$(cat /tmp/chaos_out)
    if echo "$actual" | grep -q "$expected"; then
      echo -e "${GREEN}PASS${NC}"
      ((PASS++))
    else
      echo -e "${RED}FAIL (expected: $expected, got: $actual)${NC}"
      ((FAIL++))
    fi
  else
    echo -e "${RED}ERROR${NC}"
    ((FAIL++))
  fi
}

echo "═══════════════════════════════════════"
echo "  SinaiCamps Chaos Test — $(date)"
echo "  Target: $BASE_URL"
echo "═══════════════════════════════════════"
echo ""

echo "▶ Scenario 1: Rate Limiter"
echo "  Sending 110 rapid requests to auth endpoint..."
BLOCKED=0
for i in $(seq 1 110); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/sign-in" \
    -X POST -H "Content-Type: application/json" -d '{}' --max-time 3 2>/dev/null)
  [ "$CODE" = "429" ] && ((BLOCKED++)) || true
done
if [ "$BLOCKED" -gt 5 ]; then
  echo -e "  ${GREEN}PASS${NC}: Rate limiter triggered ($BLOCKED/110 requests blocked)"
  ((PASS++))
else
  echo -e "  ${RED}FAIL${NC}: Rate limiter did not trigger ($BLOCKED/110 blocked)"
  ((FAIL++))
fi

echo ""
echo "▶ Scenario 2: Redis Unavailability (fallback)"
if pgrep redis-server > /dev/null 2>&1; then
  echo "  Stopping Redis..."
  sudo systemctl stop redis-server 2>/dev/null || true
  sleep 2
  check "App responds after Redis down" \
    "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/api/health" \
    "200"
  echo "  Restarting Redis..."
  sudo systemctl start redis-server 2>/dev/null || true
else
  echo -e "  ${YELLOW}SKIP${NC}: Redis not running"
  ((SKIP++))
fi

echo ""
echo "▶ Scenario 3: Health endpoint always responds"
check "Health endpoint" \
  "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/api/health" \
  "200"

echo ""
echo "▶ Scenario 4: CSRF Protection"
check "CSRF blocks mutation without token" \
  "curl -s -o /dev/null -w '%{http_code}' -X POST $BASE_URL/api/manage/test \
    -H 'Content-Type: application/json' \
    -H 'Cookie: x-csrf-token=validtoken' \
    -H 'x-csrf-token: wrongtoken' \
    -d '{}'" \
  "403"

echo ""
echo "▶ Scenario 5: Static assets under load"
echo "  Sending 50 concurrent requests for static asset..."
ERRORS=0
for i in $(seq 1 50); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_next/static/css/app.css" --max-time 5 2>/dev/null || echo "000")
  ([ "$CODE" = "404" ] || [ "$CODE" = "000" ]) && ((ERRORS++)) || true
done &
wait
if [ "$ERRORS" -lt 10 ]; then
  echo -e "  ${GREEN}PASS${NC}: Static assets served under load ($ERRORS/50 errors)"
  ((PASS++))
else
  echo -e "  ${YELLOW}WARN${NC}: High static asset errors ($ERRORS/50)"
  ((FAIL++))
fi

echo ""
echo "═══════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}  ${RED}$FAIL failed${NC}  ${YELLOW}$SKIP skipped${NC}"
echo "═══════════════════════════════════════"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
```

Make executable: `chmod +x scripts/chaos-test.sh`

### 6.2 Performance Baseline Document

**File:** `PERFORMANCE_BASELINE.md` (new file in project root)

```markdown
# SinaiCamps Performance Baseline

Last updated: (fill in after first run)

## How to Update

```bash
./scripts/load-test.sh --medium  # 100 req, concurrency 5
./scripts/load-test.sh --heavy   # 500 req, concurrency 20
```

## Baseline Results

| Date | Mode | p50 | p95 | p99 | Errors | Req/s |
|------|------|-----|-----|-----|--------|-------|
| — | medium | —ms | —ms | —ms | 0% | — |
| — | heavy | —ms | —ms | —ms | 0% | — |

## Alert Threshold
Alert if p95 latency regresses > 20% from baseline in any monthly run.

## Endpoint Benchmarks

| Endpoint | Expected p95 | Notes |
|----------|-------------|-------|
| `GET /` | < 300ms | Marketplace homepage |
| `GET /api/public/search` | < 200ms | Nginx-cached 60s |
| `POST /api/auth/sign-in` | < 500ms | Better Auth + DB query |
| `GET /api/health` | < 50ms | Should be instant |
```

### 6.3 Weekly Automated Test Workflow

**File:** `.github/workflows/weekly-checks.yml` (new file)

```yaml
name: Weekly Regression Checks

on:
  schedule:
    - cron: '0 6 * * 1'  # Monday 6am UTC
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm install
      - name: Full test suite
        run: npm test
      - name: Security audit
        run: npm audit --audit-level=high
      - name: Type check
        run: npm run type-check
      - name: Notify on failure
        if: failure()
        run: |
          echo "Weekly checks FAILED on $(date)" 
          # Add webhook notification here
```

### Verification (Phase 6)
```bash
npm test                              # must still pass
bash scripts/chaos-test.sh            # should pass all scenarios
```

---

## Phase 7 — Ongoing Maintenance Scripts

**Agent:** @devops  
**Priority:** LOW — do after all above  
**Estimated time:** 1-2 hours

### 7.1 Daily Check Script

**File:** `scripts/daily-check.sh` (new file)

```bash
#!/bin/bash
# Daily automated health check
# Run via cron: 0 7 * * * bash /home/ubuntu/marketplace/scripts/daily-check.sh >> /home/ubuntu/marketplace/logs/daily.log 2>&1

set -uo pipefail
DATE=$(date '+%Y-%m-%d %H:%M:%S')
PROJ="${PROJ:-/home/ubuntu/marketplace}"
BASE_URL="${BASE_URL:-https://sinaicamps.com}"
ISSUES=0

echo "══════════════════════════════════"
echo "Daily Check — $DATE"
echo "══════════════════════════════════"

# 1. PM2 status
echo -n "[1] PM2 status: "
if pm2 status sinaicamps | grep -q "online"; then
  echo "✅ online"
else
  echo "❌ NOT RUNNING"
  ((ISSUES++))
fi

# 2. Health endpoint
echo -n "[2] Health endpoint: "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/health" 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then
  echo "✅ HTTP 200"
else
  echo "❌ HTTP $HTTP"
  ((ISSUES++))
fi

# 3. Disk usage
echo -n "[3] Disk usage: "
DISK=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK" -lt 80 ]; then
  echo "✅ ${DISK}% used"
else
  echo "⚠️  ${DISK}% used — WARNING"
  ((ISSUES++))
fi

# 4. Log directory size
echo -n "[4] Log directory: "
LOG_SIZE=$(du -sm "$PROJ/logs" 2>/dev/null | cut -f1)
echo "${LOG_SIZE}MB"
if [ "${LOG_SIZE:-0}" -gt 500 ]; then
  echo "⚠️  Logs > 500MB — consider rotating"
  ((ISSUES++))
fi

# 5. Backup freshness
echo -n "[5] Last backup: "
LATEST_BACKUP=$(ls -t "$PROJ/backups"/backup-*.db 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
  AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
  if [ "$AGE_HOURS" -lt 26 ]; then
    echo "✅ ${AGE_HOURS}h ago"
  else
    echo "❌ ${AGE_HOURS}h ago — BACKUP OVERDUE"
    ((ISSUES++))
  fi
else
  echo "❌ No backups found"
  ((ISSUES++))
fi

# 6. SSL cert expiry
echo -n "[6] SSL cert expiry: "
EXPIRY=$(echo | openssl s_client -servername sinaicamps.com -connect sinaicamps.com:443 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "unknown")
echo "$EXPIRY"

echo "══════════════════════════════════"
if [ "$ISSUES" -gt 0 ]; then
  echo "⚠️  $ISSUES issue(s) found — review above"
  exit 1
else
  echo "✅ All checks passed"
fi
```

Make executable: `chmod +x scripts/daily-check.sh`

### 7.2 Weekly Security Review Script

**File:** `scripts/weekly-check.sh` (new file)

```bash
#!/bin/bash
# Weekly security and health review
# Run via cron: 0 8 * * 1 bash /home/ubuntu/marketplace/scripts/weekly-check.sh >> /home/ubuntu/marketplace/logs/weekly.log 2>&1

set -uo pipefail
DATE=$(date '+%Y-%m-%d %H:%M:%S')
PROJ="${PROJ:-/home/ubuntu/marketplace}"

echo "══════════════════════════════════"
echo "Weekly Security Check — $DATE"
echo "══════════════════════════════════"

echo "▶ Checking for suspicious auth patterns in audit logs..."
sqlite3 "$PROJ/sinaicamps.db" "
  SELECT action, COUNT(*) as count 
  FROM audit_logs 
  WHERE created_at > datetime('now', '-7 days')
  GROUP BY action 
  ORDER BY count DESC 
  LIMIT 20
" 2>/dev/null || echo "Could not query audit logs"

echo ""
echo "▶ Top active users last 7 days..."
sqlite3 "$PROJ/sinaicamps.db" "
  SELECT user_id, COUNT(*) as actions 
  FROM audit_logs 
  WHERE created_at > datetime('now', '-7 days') 
  GROUP BY user_id 
  ORDER BY actions DESC 
  LIMIT 10
" 2>/dev/null || echo "Could not query audit logs"

echo ""
echo "▶ PM2 restart count this week..."
pm2 show sinaicamps | grep -i restart || true

echo ""
echo "▶ Error log summary (last 100 lines)..."
tail -100 "$PROJ/logs/pm2-error.log" 2>/dev/null | grep -c "ERROR" | xargs echo "ERROR count:"

echo "✅ Weekly check complete"
```

Make executable: `chmod +x scripts/weekly-check.sh`

### 7.3 Add All Cron Jobs

Update `scripts/setup-cron.sh` to include the new daily/weekly scripts:
```bash
# Daily check at 7am
(crontab -l 2>/dev/null; echo "0 7 * * * bash $PROJ/scripts/daily-check.sh >> $PROJ/logs/daily.log 2>&1") | crontab -

# Weekly security review every Monday at 8am
(crontab -l 2>/dev/null; echo "0 8 * * 1 bash $PROJ/scripts/weekly-check.sh >> $PROJ/logs/weekly.log 2>&1") | crontab -
```

---

## Final Verification Checklist

Run these after all phases are complete:

```bash
# 1. All tests pass
npm test
echo "Expected: 1159 tests passing"

# 2. Build succeeds
npm run build

# 3. Security audit clean
npm audit --audit-level=high

# 4. Type check passes
npm run type-check

# 5. Metrics endpoint works
curl http://localhost:3000/api/metrics -H "Authorization: Bearer $METRICS_TOKEN" | head -20

# 6. Health check passes
curl http://localhost:3000/api/health

# 7. Backup integrity
bash scripts/backup-db.sh
bash scripts/test-restore.sh

# 8. Chaos tests pass
bash scripts/chaos-test.sh

# 9. All runbooks exist
ls runbooks/
# Expected: app-crash.md, db-lock.md, high-memory.md, ddos-response.md, deploy-rollback.md, tenant-breach.md, secret-rotation.md

# 10. New files created
ls SLO.md PERFORMANCE_BASELINE.md prometheus.yml alertmanager.yml docker-compose.monitoring.yml
```

---

## Files Created Summary

### New Files
```
ecosystem.config.js                    ← updated (cluster mode)
prometheus.yml                         ← new
alertmanager.yml                       ← new
docker-compose.monitoring.yml          ← new
SLO.md                                 ← new
PERFORMANCE_BASELINE.md               ← new
alerts/sinaicamps.yml                 ← new
runbooks/app-crash.md                 ← new
runbooks/db-lock.md                   ← new
runbooks/high-memory.md               ← new
runbooks/ddos-response.md             ← new
runbooks/deploy-rollback.md           ← new
runbooks/tenant-breach.md             ← new
runbooks/secret-rotation.md           ← new
scripts/health-check.sh               ← new
scripts/test-restore.sh               ← new
scripts/chaos-test.sh                 ← new
scripts/daily-check.sh                ← new
scripts/weekly-check.sh               ← new
scripts/setup-cron.sh                 ← new
scripts/setup-pm2-logrotate.sh        ← new
.github/dependabot.yml                ← new
.github/workflows/weekly-checks.yml  ← new
```

### Modified Files
```
src/lib/metrics.ts                    ← prom-client integration
src/lib/cookie-signing.ts             ← new HMAC signing utility
src/middleware.ts                     ← role cookie hardening, CSP nonce, metrics
src/app/api/metrics/route.ts          ← new Prometheus endpoint
scripts/deploy-prod.sh                ← rollback logic
scripts/backup-db.sh                  ← integrity check + 30-day retention
.github/workflows/ci.yml              ← remove continue-on-error
.github/workflows/deploy.yml          ← post-deploy health check
nginx-unified.conf                    ← timeout guards
.env.example                          ← new env vars documented
```

---

## Agent Assignments Summary

| Phase | Agent | Est. Time |
|-------|-------|-----------|
| 1 — Zero-Downtime | @devops | 2-3h |
| 2 — Observability | @devops + @backend_architect | 4-6h |
| 3 — DB Resilience | @db_architect | 2-3h |
| 4 — Security | @security | 3-4h |
| 5 — SLO + Runbooks | @devops | 2h |
| 6 — Chaos Testing | @qa | 2-3h |
| 7 — Maintenance Scripts | @devops | 1-2h |
| **Total** | | **16-21h** |

**Execute phases in order. Run `npm test` after each phase. Stop and escalate if test count drops below 1159.**
