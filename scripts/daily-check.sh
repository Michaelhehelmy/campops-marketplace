#!/bin/bash
# Daily health check for SinaiCamps production
set -euo pipefail

PROJ="${PROJ:-/home/ubuntu/marketplace}"
DB="${PROJ}/data/sinaicamps.db"
HEALTH="http://localhost:3000/api/v1/health"
PASS=0
FAIL=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

check() {
  local desc="$1"
  shift
  if eval "$@"; then
    log "✅ $desc"
    ((PASS++))
  else
    log "❌ $desc"
    ((FAIL++))
  fi
}

log "Starting daily check..."

# App health
check "App health check" curl -sf -o /dev/null "$HEALTH"

# PM2 status
PM2_OK=$(pm2 jlist 2>/dev/null | python3 -c "
import json,sys
procs=json.load(sys.stdin)
online=[p for p in procs if p.get('pm2_env',{}).get('status')=='online']
print(len(online))
" 2>/dev/null || echo 0)
check "PM2 processes online ($PM2_OK)" [[ $PM2_OK -ge 1 ]]

# DB integrity
check "DB integrity" sqlite3 "$DB" "PRAGMA integrity_check" 2>/dev/null | grep -q ok

# DB size
DB_SIZE=$(du -h "$DB" | cut -f1)
log "📊 DB size: $DB_SIZE"

# Disk space
DISK_USED=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USED" -gt 85 ]; then
  log "⚠️  Disk usage critical: ${DISK_USED}%"
  ((FAIL++))
else
  log "✅ Disk usage: ${DISK_USED}%"
  ((PASS++))
fi

# Memory
MEM_FREE=$(free -m | awk '/Mem:/ {print int($7)}')
if [ "$MEM_FREE" -lt 200 ]; then
  log "⚠️  Low memory: ${MEM_FREE}MB free"
  ((FAIL++))
else
  log "✅ Memory free: ${MEM_FREE}MB"
  ((PASS++))
fi

# Uptime
UPTIME=$(curl -sf "$HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('uptime','?'))" 2>/dev/null || echo "?")
log "📊 Uptime: ${UPTIME}s"

# SSL expiry (check via openssl)
SSL_EXPIRY=$(echo | openssl s_client -servername sinaicamps.com -connect sinaicamps.com:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "unknown")
log "📊 SSL expiry: $SSL_EXPIRY"

log "Daily check complete — $PASS passed, $FAIL failed"

# Non-fatal: don't exit with error (alerting handled by cron output)
exit 0
