# Incident Response Runbook

## Triage Severities

| Severity | Definition | Response Time |
|----------|------------|--------------|
| SEV1 | Complete outage or data loss | < 15 min |
| SEV2 | Partial degradation, core feature broken | < 1 h |
| SEV3 | Minor issue, no user impact | < 24 h |

## On-Call Response Checklist

### 1. Acknowledge
- Check the monitoring dashboard
- Confirm the alert is not a false positive

### 2. Assess
- Determine severity based on user impact
- Check recent deploy (last 1h) — rollback if suspicious
- Check PM2 logs: `pm2 logs --lines 100`
- Check Nginx error logs: `tail -100 /var/log/nginx/error.log`
- Check app logs: `tail -100 logs/app.log`
- Check database: `sqlite3 data/sinaicamps.db "PRAGMA integrity_check"`

### 3. Mitigate
- If SEV1: rollback immediately via `bash scripts/deploy-prod.sh rollback`
- If disk space issue: run `bash scripts/rotate-logs.sh`
- If DB locked: `sqlite3 data/sinaicamps.db "PRAGMA wal_checkpoint(FULL)"`
- If app crashed: PM2 auto-restarts, verify with `pm2 status`

### 4. Communicate
- Document findings in runbooks/ directory
- If data loss suspected: stop all writes, contact team

### 5. Resolve
- Verify fix: health check + test restore + manual smoke test
- Post-mortem within 48h for SEV1/SEV2

## Quick Commands

```bash
# App status
pm2 status
pm2 show app-name
pm2 logs --lines 50

# Database
sqlite3 data/sinaicamps.db "PRAGMA integrity_check"
sqlite3 data/sinaicamps.db "PRAGMA wal_checkpoint(FULL)"
du -sh data/sinaicamps.db

# System
df -h
free -m
top -bn1 | head -5

# Network
curl -s -o /dev/null -w "%{http_code}" https://sinaicamps.com/api/v1/health
ss -tlnp | grep -E '(3000|443)'

# Backup
ls -lt backups/ | head -5
bash scripts/test-restore.sh
```
