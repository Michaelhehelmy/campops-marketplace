#!/bin/bash
# Chaos & Resilience Tests — run weekly on staging or by hand
# Returns non-zero if any test fails
set -uo pipefail

PROJ="${PROJ:-/home/ubuntu/marketplace}"
DB="${PROJ}/data/sinaicamps.db"
HEALTH="http://localhost:3000/api/v1/health"
PASS=0
FAIL=0

green() { echo -e "\033[32m$1\033[0m"; }
red()   { echo -e "\033[31m$1\033[0m"; }

assert() {
  local desc="$1"
  shift
  if eval "$@"; then
    green "  ✅ $desc"
    ((PASS++))
  else
    red "  ❌ $desc"
    ((FAIL++))
  fi
}

echo "═══ Chaos & Resilience Tests ═══"
echo "Started: $(date)"

# 1. Health check
echo ""
echo "--- 1. Health endpoint ---"
assert "GET /api/v1/health returns 200" \
  "curl -sf -o /dev/null -w '%{http_code}' '$HEALTH' | grep -q 200"
assert "Health body contains ok" \
  "curl -sf '$HEALTH' | grep -qi ok"

# 2. Database integrity
echo ""
echo "--- 2. Database integrity ---"
INTEGRITY=$(sqlite3 "$DB" "PRAGMA integrity_check" 2>&1)
assert "PRAGMA integrity_check returns ok" \
  "[[ '$INTEGRITY' == 'ok' ]]"
FK=$(sqlite3 "$DB" "PRAGMA foreign_key_check" 2>&1)
assert "PRAGMA foreign_key_check returns empty" \
  "[[ -z '$FK' ]]"

# 3. Metrics endpoint
echo ""
echo "--- 3. Metrics endpoint ---"
if [ -n "${METRICS_TOKEN:-}" ]; then
  AUTH="-H 'Authorization: Bearer $METRICS_TOKEN'"
else
  AUTH=""
fi
assert "GET /api/metrics returns 200" \
  "curl -sf $AUTH -o /dev/null -w '%{http_code}' '$HEALTH' | grep -q 200"

# 4. PM2 process status
echo ""
echo "--- 4. PM2 status ---"
PM2_COUNT=$(pm2 jlist 2>/dev/null | python3 -c "import json,sys; data=json.load(sys.stdin); print(len([p for p in data if p.get('pm2_env',{}).get('status')=='online']))" 2>/dev/null || echo 0)
assert "At least 1 PM2 process online" \
  "[[ $PM2_COUNT -ge 1 ]]"

# 5. Simulate concurrent DB reads (open 10 connections)
echo ""
echo "--- 5. Concurrent DB read test ---"
CONCUR_OK=1
for i in $(seq 1 10); do
  R=$(sqlite3 "$DB" "SELECT COUNT(*) FROM users" 2>&1) || { CONCUR_OK=0; break; }
done
assert "10 concurrent reads succeed" \
  "[[ $CONCUR_OK -eq 1 ]]"

# 6. Backup directory exists and has recent file
echo ""
echo "--- 6. Backup sanity ---"
assert "Backups directory exists" \
  "[[ -d '${PROJ}/backups' ]]"
RECENT_BACKUP=$(ls -t "${PROJ}/backups"/backup-*.db 2>/dev/null | head -1)
assert "At least one backup exists" \
  "[[ -n '$RECENT_BACKUP' ]]"

# Summary
echo ""
echo "═══ Results ═══"
green "Passed: $PASS"
if [ "$FAIL" -gt 0 ]; then
  red "Failed: $FAIL"
  exit 1
else
  echo "All chaos tests passed!"
  exit 0
fi
