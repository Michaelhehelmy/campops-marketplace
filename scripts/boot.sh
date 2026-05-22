#!/bin/bash
# SinaiCamps Persistence & Recovery Script
# This script runs on reboot to ensure services are active without overwriting data.

LOG_FILE="/home/ubuntu/marketplace/logs/boot.log"
mkdir -p /home/ubuntu/marketplace/logs
echo "[$(date)] System reboot detected. Starting recovery..." >> $LOG_FILE

# 1. Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo "[$(date)] PostgreSQL is already running." >> $LOG_FILE
else
    echo "[$(date)] Starting PostgreSQL..." >> $LOG_FILE
    sudo systemctl start postgresql
fi

# 2. Check Nginx
if systemctl is-active --quiet nginx; then
    echo "[$(date)] Nginx is already running. Reloading..." >> $LOG_FILE
    sudo systemctl reload nginx
else
    echo "[$(date)] Starting Nginx..." >> $LOG_FILE
    sudo systemctl start nginx
fi

# 3. Ensure SQLite WAL mode on reboot
DB_PATH=/home/ubuntu/marketplace/sinaicamps-prod.db
if [ -f "$DB_PATH" ]; then
  CURRENT_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;" 2>/dev/null)
  if [ "$CURRENT_MODE" != "wal" ]; then
    sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" 2>/dev/null
  fi
  sqlite3 "$DB_PATH" "PRAGMA busy_timeout=30000;" 2>/dev/null || true
fi

# 4. Check Application (PM2)
cd /home/ubuntu/marketplace
if pm2 list | grep -q "sinaicamps"; then
    echo "[$(date)] Application is managed by PM2. Reloading gracefully..." >> $LOG_FILE
    pm2 startOrReload ecosystem.config.js --update-env
else
    echo "[$(date)] Application process not found in PM2. Starting fresh..." >> $LOG_FILE
    export $(cat .env.production | xargs)
    pm2 start ecosystem.config.js --update-env
fi

# 5. Health check — wait for server to respond
echo "[$(date)] Waiting for application health check..." >> $LOG_FILE
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null)
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "503" ]; then
    echo "[$(date)] Health check passed (status: $STATUS)." >> $LOG_FILE
    break
  fi
  echo "[$(date)] Waiting for server... (attempt $i)" >> $LOG_FILE
  sleep 2
done

echo "[$(date)] Recovery complete." >> $LOG_FILE

# To schedule daily backups, add to crontab (run once manually):
#   crontab -e
#   0 3 * * * /home/ubuntu/marketplace/scripts/backup-db.sh && /home/ubuntu/marketplace/scripts/backup-s3.sh
# This creates offsite backups daily at 3 AM regardless of deployment schedule.
