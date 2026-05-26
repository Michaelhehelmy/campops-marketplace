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

# Daily check at 7am
(crontab -l 2>/dev/null; echo "0 7 * * * bash $PROJ/scripts/daily-check.sh >> $PROJ/logs/daily.log 2>&1") | crontab -

# Weekly security review every Monday at 8am
(crontab -l 2>/dev/null; echo "0 8 * * 1 bash $PROJ/scripts/weekly-check.sh >> $PROJ/logs/weekly.log 2>&1") | crontab -

# Log rotation at 3am daily
(crontab -l 2>/dev/null; echo "0 3 * * * bash $PROJ/scripts/rotate-logs.sh >> $PROJ/logs/rotate.log 2>&1") | crontab -

echo "✅ Cron jobs installed:"
crontab -l
