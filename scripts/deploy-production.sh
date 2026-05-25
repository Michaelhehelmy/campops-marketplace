#!/bin/bash
set -euo pipefail

echo "=== SinaiCamps Production Deployment ==="

# 1. Pre-deployment checks
echo "--- Running pre-deployment checks ---"
npm ci --production=false
npm run lint
npm run build

# 2. Database migrations
echo "--- Running database migrations ---"
npm run db:migrate

# 3. Deploy to server (rsync)
if [ -n "${DEPLOY_SERVER:-}" ] && [ -n "${DEPLOY_PATH:-}" ]; then
  echo "--- Deploying to $DEPLOY_SERVER:$DEPLOY_PATH ---"
  rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next/cache' \
    --include='.next/**' \
    --include='public/**' \
    --include='package.json' \
    --include='ecosystem.config.js' \
    --exclude='*' \
    ./ "$DEPLOY_SERVER:$DEPLOY_PATH/"

  # Install production deps and restart
  ssh "$DEPLOY_SERVER" <<-SSHEOF
    cd "$DEPLOY_PATH"
    npm install --production
    npm run db:migrate
    pm2 reload ecosystem.config.js --env production
    sleep 3
    pm2 status
SSHEOF
else
  echo "--- DEPLOY_SERVER/DEPLOY_PATH not set, skipping remote deploy ---"
  echo "--- Build is ready at .next/ ---"
fi

# 4. Post-deployment verification
echo "--- Post-deployment health checks ---"
if [ -n "${PRODUCTION_URL:-}" ]; then
  for endpoint in /api/health /api/health/db /api/health/cache; do
    if curl -sf "$PRODUCTION_URL$endpoint" > /dev/null 2>&1; then
      echo "  ✅ $endpoint"
    else
      echo "  ❌ $endpoint — FAILED"
    fi
  done
fi

echo "=== Deployment complete ==="
