# Secret Rotation Runbook

## Secrets to Rotate

| Secret | Rotation Frequency | Source of Truth |
|--------|------------------|-----------------|
| BETTER_AUTH_SECRET | Every 90 days | .env / PM2 |
| COOKIE_SIGNING_SECRET | Every 90 days | .env / PM2 |
| METRICS_TOKEN | Every 90 days | .env / PM2 |

## Rotation Procedure

### 1. Generate new secrets
```bash
openssl rand -base64 32
```

### 2. Update .env file on server
```bash
ssh user@host
cd /path/to/project
# Edit .env, replace the secret value

# Reload process with PM2
pm2 reload ecosystem.config.js --update-env

# Or if using the deploy script:
bash scripts/deploy-prod.sh
```

### 3. Verify
```bash
# Check that the app responds
curl -s -o /dev/null -w "%{http_code}" https://sinaicamps.com/api/v1/health

# Check metrics endpoint (if token was rotated)
curl -H "Authorization: Bearer <new_token>" https://sinaicamps.com/api/metrics
```

### 4. Rollback (if needed)
```bash
# Restore previous .env backup
cp .env.backup .env
pm2 reload ecosystem.config.js --update-env
```

## Emergency
If secret is compromised:
1. Rotate immediately (do not wait for scheduled rotation)
2. Revoke any leaked tokens
3. Check audit logs for suspicious activity
4. Notify the team
