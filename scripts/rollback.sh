#!/bin/bash
set -euo pipefail

echo "=== Rollback Procedure ==="

if [ -z "${ROLLBACK_TAG:-}" ]; then
  echo "Error: ROLLBACK_TAG not set. Usage: ROLLBACK_TAG=v1.0.0 ./scripts/rollback.sh"
  echo "Available tags:"
  git tag --sort=-v:refname | head -10
  exit 1
fi

echo "--- Rolling back to $ROLLBACK_TAG ---"
git checkout "$ROLLBACK_TAG"
npm install --production

if [ -n "${DEPLOY_SERVER:-}" ]; then
  rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next/cache' \
    ./.next "$DEPLOY_SERVER:$DEPLOY_PATH/"
  rsync -avz package.json ecosystem.config.js "$DEPLOY_SERVER:$DEPLOY_PATH/"

  ssh "$DEPLOY_SERVER" "cd $DEPLOY_PATH && npm install --production && pm2 reload ecosystem.config.js"
fi

echo "=== Rollback to $ROLLBACK_TAG complete ==="
