#!/bin/bash
# =============================================================================
# deploy.sh — CampOps Marketplace Auto-Deploy Script
# Place this file at: ~/marketplace/scripts/deploy.sh on the Oracle server
# =============================================================================

set -euo pipefail

APP_DIR="$HOME/marketplace"
APP_NAME="sinaicamps"
BRANCH="main"
LOG_FILE="$HOME/deploy.log"
NODE_OPTIONS="--max-old-space-size=2048"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "${GREEN}========================================${NC}"
log "${GREEN}  CampOps Marketplace Deploy Started${NC}"
log "${GREEN}========================================${NC}"

# ── 1. Navigate to project ────────────────────────────────────────────────────
cd "$APP_DIR" || { log "${RED}ERROR: $APP_DIR not found${NC}"; exit 1; }

# ── 2. Pull latest from GitHub ────────────────────────────────────────────────
log "${YELLOW}[1/5] Pulling latest from GitHub ($BRANCH)...${NC}"
git fetch origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  log "Already up to date — skipping build."
  # Uncomment below to force redeploy even if no changes:
  # log "No changes detected. Exiting."
  # exit 0
fi

git pull origin "$BRANCH"
log "Pulled: $(git log -1 --pretty='%h %s')"

# ── 3. Clean & install dependencies ──────────────────────────────────────────
log "${YELLOW}[2/5] Cleaning node_modules...${NC}"
rm -rf packages/*/node_modules node_modules

log "${YELLOW}[3/5] Installing dependencies...${NC}"
npm install

# ── 4. Build ──────────────────────────────────────────────────────────────────
log "${YELLOW}[4/5] Building...${NC}"
export NODE_OPTIONS="$NODE_OPTIONS"
NODE_ENV=production npm run build

# ── 5. Restart PM2 ────────────────────────────────────────────────────────────
log "${YELLOW}[5/5] Restarting PM2...${NC}"
sudo fuser -k 5000/tcp 2>/dev/null || true

if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  log "Starting PM2 process for the first time..."
  NODE_ENV=production pm2 start npm --name "$APP_NAME" -- run start
fi

pm2 save

log "${GREEN}✅ Deploy complete!${NC}"
log "$(pm2 list)"
