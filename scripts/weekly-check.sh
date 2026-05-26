#!/bin/bash
# Weekly production check for SinaiCamps
set -euo pipefail

PROJ="${PROJ:-/home/ubuntu/marketplace}"
DB="${PROJ}/data/sinaicamps.db"
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

log "Starting weekly check..."

# Summary of last week's backups
log "📊 Backup summary (last 7):"
ls -lh "${PROJ}/backups"/backup-*.db 2>/dev/null | tail -7 || log "  (no backups)"

# Run restore test
log "Running restore test..."
if bash "${PROJ}/scripts/test-restore.sh" 2>&1; then
  PASS=$((PASS+1))
  log "✅ Restore test passed"
else
  FAIL=$((FAIL+1))
  log "❌ Restore test failed"
fi

# Log rotation
log "Checking log sizes..."
for f in "${PROJ}/logs"/*.log; do
  SIZE=$(du -h "$f" | cut -f1)
  log "  $f: $SIZE"
done

# PM2 memory per process
log "PM2 memory usage:"
pm2 jlist 2>/dev/null | python3 -c "
import json,sys
procs=json.load(sys.stdin)
for p in procs:
  name=p.get('name','?')
  mem=p.get('monit',{}).get('memory',0)
  cpu=p.get('monit',{}).get('cpu',0)
  print(f'  {name}: {mem/1024/1024:.0f}MB CPU:{cpu:.0f}%')
" 2>/dev/null || log "  (unable to read)"

# Foreign key integrity
FK=$(sqlite3 "$DB" "PRAGMA foreign_key_check" 2>&1)
check "Foreign key integrity" [[ -z "$FK" ]]

# Build check
check "Source builds clean" npm run build --prefix "$PROJ" 2>&1 | tail -1 | grep -q "successfully"

log "Weekly check complete — $PASS passed, $FAIL failed"
exit 0
