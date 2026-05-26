#!/bin/bash
# Production Deployment Script for Oracle VM
set -euo pipefail

BASE_URL="${BASE_URL:-https://sinaicamps.com}"
echo "[deploy] Starting deployment..."

cd ~/marketplace

# Ensure directories
mkdir -p scripts logs .next/standalone

# Setup boot script
if [ -f boot.sh ]; then
  mv boot.sh scripts/boot.sh
  chmod +x scripts/boot.sh
fi

# Run database pre-deployment backup
echo "[deploy] Running pre-deployment database backup..."
bash scripts/backup-db.sh

# Ensure SQLite WAL mode is enabled for concurrent read performance
DB_PATH=~/marketplace/sinaicamps-prod.db
if [ -f "$DB_PATH" ]; then
  CURRENT_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null)
  echo "[deploy] Current journal mode: $CURRENT_MODE"
  if [ "$CURRENT_MODE" != "wal" ]; then
    echo "[deploy] Switching to WAL mode..."
    sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null
  fi
  sqlite3 "$DB_PATH" "PRAGMA busy_timeout=30000;" 2>/dev/null || true
  echo "[deploy] SQLite WAL mode confirmed."
fi

# Reload Nginx (before PM2 reload to avoid routing to old instance)
sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo ln -sf /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Save current process list as rollback point
pm2 save

# Graceful reload (zero downtime) — uses ecosystem.config.js
# --update-env picks up any changed env vars from .env.production
echo "[deploy] Reloading PM2..."
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env

echo "[deploy] Waiting for health check..."
sleep 8

# Verify deployment succeeded
if ! bash "$(dirname "$0")/health-check.sh" "${BASE_URL}"; then
  echo "❌ [deploy] Health check failed — rolling back..."
  pm2 restart sinaicamps --update-env
  sleep 5
  if bash "$(dirname "$0")/health-check.sh" "${BASE_URL}"; then
    echo "⚠️  [deploy] Rollback succeeded — previous version restored"
  else
    echo "❌ [deploy] Rollback also failed — manual intervention required"
    exit 2
  fi
  exit 1
fi

pm2 save
echo "✅ [deploy] Deployment successful"
