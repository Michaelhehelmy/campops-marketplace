#!/bin/bash
# Post-deploy health check
# Usage: bash scripts/health-check.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-https://sinaicamps.com}"
MAX_ATTEMPTS=15
SLEEP_SECONDS=5
FAILED_ATTEMPTS=0

echo "▶ Running health check against $BASE_URL"

for i in $(seq 1 $MAX_ATTEMPTS); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    --retry 0 \
    "$BASE_URL/api/health" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed (attempt $i, HTTP $HTTP_CODE)"
    exit 0
  fi

  echo "⏳ Attempt $i/$MAX_ATTEMPTS — HTTP $HTTP_CODE, retrying in ${SLEEP_SECONDS}s..."
  sleep $SLEEP_SECONDS
done

echo "❌ Health check FAILED after $MAX_ATTEMPTS attempts"
exit 1
