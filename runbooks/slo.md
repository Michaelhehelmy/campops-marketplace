# Service Level Objectives (SLOs)

## Current Objectives
| Indicator | Target | Measurement | Window |
|-----------|--------|-------------|--------|
| Uptime | 99.9% | Health check endpoint (PM2/nginx) | 30 days |
| API Latency (p95) | < 500ms | `sinaicamps_http_duration_ms` (95th percentile) | 5 min |
| Error Rate | < 1% | `sinaicamps_http_requests_total{status=~"5.."}` / total | 5 min |
| DB Query Time (p99) | < 200ms | `sinaicamps_db_query_duration_ms` | 5 min |
| Backup Freshness | < 26h | Last successful backup timestamp | Continuous |
| Backup Integrity | 100% pass | Monthly `test-restore.sh` run | Monthly |

## Error Budget (per 30 days)
- Total allowable downtime: 43m 12s (99.9%)
- Available budget: 43m 12s per month
- Budget consumed: tracked via Prometheus uptime metric

## Burn Rate Alerts
- 2% of budget in 1h → Warning (page on-call)
- 5% of budget in 1h → Critical (escalate)
- 10% of budget in 1h → Emergency (wake entire team)

## Monitoring
- Prometheus + Alertmanager (docker-compose.monitoring.yml)
- Health check every 30s via health-check.sh (cron/PM2)
- PM2 auto-restart on crash (max_restarts: 10)
