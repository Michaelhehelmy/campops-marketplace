#!/bin/bash
# Log rotation for PM2 application logs
# Gzips logs older than 7 days, deletes compressed logs older than 30 days
#
# Usage: bash scripts/rotate-logs.sh
# Cron:  0 3 * * * bash /home/ubuntu/marketplace/scripts/rotate-logs.sh >> /home/ubuntu/marketplace/logs/rotate.log 2>&1

set -euo pipefail

PROJ="${PROJ:-$(dirname "$(cd "$(dirname "$0")" && pwd)")}"
LOGS_DIR="$PROJ/logs"

echo "[rotate-logs] $(date '+%Y-%m-%d %H:%M:%S') — starting"

mkdir -p "$LOGS_DIR"

# Gzip log files older than 7 days (skip already-compressed files)
find "$LOGS_DIR" -maxdepth 1 -name "*.log" -mtime +7 -type f | while read -r f; do
  echo "[rotate-logs] Compressing: $f"
  gzip -f "$f"
done

# Delete compressed logs older than 30 days
find "$LOGS_DIR" -maxdepth 1 -name "*.log.gz" -mtime +30 -type f | while read -r f; do
  echo "[rotate-logs] Deleting stale: $f"
  rm -f "$f"
done

# Report current log directory size
SIZE=$(du -sh "$LOGS_DIR" 2>/dev/null | cut -f1)
echo "[rotate-logs] Done. Log directory size: $SIZE"
