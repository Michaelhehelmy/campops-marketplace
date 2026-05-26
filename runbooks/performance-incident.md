# Performance Degradation Runbook

## Detection
- Alertmanager fires for: high API latency, high error rate, slow queries
- User reports of slow page loads
- PM2 high CPU/memory usage

## Immediate Actions

### 1. Check current metrics
```bash
curl -s http://localhost:3000/api/metrics | grep -E '(sinaicamps_http_duration|sinaicamps_http_requests_total|sinaicamps_db_query)'
```

### 2. Identify bottleneck
- CPU: `top -bn1 | head -10`
- Memory: `free -m`
- Disk: `df -h`
- DB size: `du -sh data/sinaicamps.db`

### 3. Database checks
```bash
# Check WAL size
ls -lh data/sinaicamps.db-wal 2>/dev/null

# Force checkpoint
sqlite3 data/sinaicamps.db "PRAGMA wal_checkpoint(FULL)"

# Analyze query plans
sqlite3 data/sinaicamps.db "ANALYZE;"

# Check busy timeouts
sqlite3 data/sinaicamps.db "PRAGMA busy_timeout;"
```

### 4. Mitigations
- Restart app: `pm2 reload ecosystem.config.js`
- WAL checkpoint: `sqlite3 data/sinaicamps.db "PRAGMA wal_checkpoint(FULL)"`
- Clear temp: `rm -rf .next && npm run build && pm2 reload all`
- If disk IO issues: reduce `wal_autocheckpoint` or increase `cache_size`

### 5. Escalation
If issue persists > 15 min:
- Check for ongoing deploy
- Review recent code changes
- Consider rolling back
