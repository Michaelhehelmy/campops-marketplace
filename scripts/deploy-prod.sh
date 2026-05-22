#!/bin/bash
# Production Deployment Script for Oracle VM
set -e

echo "Starting deployment..."
cd ~/marketplace

# Ensure directories
mkdir -p scripts logs .next/standalone

# Setup boot script
if [ -f boot.sh ]; then
  mv boot.sh scripts/boot.sh
  chmod +x scripts/boot.sh
fi

# Run database pre-deployment backup
echo "Running pre-deployment database backup..."
bash scripts/backup-db.sh

# Ensure SQLite WAL mode is enabled for concurrent read performance
DB_PATH=~/marketplace/sinaicamps-prod.db
if [ -f "$DB_PATH" ]; then
  CURRENT_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null)
  echo "Current journal mode: $CURRENT_MODE"
  if [ "$CURRENT_MODE" != "wal" ]; then
    echo "Switching to WAL mode..."
    sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null
  fi
  sqlite3 "$DB_PATH" "PRAGMA busy_timeout=30000;" 2>/dev/null || true
  echo "SQLite WAL mode confirmed."
fi

# Reload Nginx (before PM2 reload to avoid routing to old instance)
sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo ln -sf /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Graceful reload (zero downtime) — uses ecosystem.config.js
# --update-env picks up any changed env vars from .env.production
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env
pm2 save

# Health check after reload — accept 200 (healthy) or 503 (degraded but running)
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "503" ]; then
    echo "Deployment successful (health: $STATUS)."
    exit 0
  fi
  sleep 2
done

echo "Health check failed after deployment." >&2
exit 1
