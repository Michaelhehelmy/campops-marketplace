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

# 3. Check Application (PM2)
cd /home/ubuntu/marketplace
if pm2 list | grep -q "sinaicamps"; then
    echo "[$(date)] Application is managed by PM2. Ensuring it is started..." >> $LOG_FILE
    pm2 start sinaicamps || pm2 restart sinaicamps
else
    echo "[$(date)] Application process not found in PM2. Starting fresh..." >> $LOG_FILE
    export $(cat .env.production | xargs)
    pm2 start server.js --name sinaicamps
fi

echo "[$(date)] Recovery complete." >> $LOG_FILE
