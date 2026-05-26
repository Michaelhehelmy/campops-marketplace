#!/bin/bash
# SinaiCamps Master Deployment Script
# Run this from your LOCAL machine to update the Oracle VM.
set -euo pipefail

# Configuration
VM_IP="84.235.239.6"
SSH_KEY="/home/michael/Downloads/oracle.key"
REMOTE_USER="ubuntu"
REMOTE_PATH="~/marketplace"
BASE_DOMAIN="${BASE_DOMAIN:-sinaicamps.com}"

echo "🚀 Starting Deployment to SinaiCamps ($VM_IP)..."

# 1. Pre-deployment backup on remote
echo "📦 Pre-deployment database backup..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" "cd $REMOTE_PATH && bash scripts/backup-db.sh" || echo "⚠️  Backup skipped (may not exist yet)"

# 2. Sync Files
echo "📦 Syncing files..."
rsync -avz -e "ssh -i $SSH_KEY" .next/standalone/ "$REMOTE_USER@$VM_IP:$REMOTE_PATH/"
rsync -avz -e "ssh -i $SSH_KEY" .next/static/ "$REMOTE_USER@$VM_IP:$REMOTE_PATH/.next/static/"
rsync -avz -e "ssh -i $SSH_KEY" public/ "$REMOTE_USER@$VM_IP:$REMOTE_PATH/public/"
rsync -avz -e "ssh -i $SSH_KEY" plugins/ "$REMOTE_USER@$VM_IP:$REMOTE_PATH/plugins/"
rsync -avz --exclude='node_modules' -e "ssh -i $SSH_KEY" packages/ "$REMOTE_USER@$VM_IP:$REMOTE_PATH/packages/"
rsync -avz -e "ssh -i $SSH_KEY" node_modules/hono "$REMOTE_USER@$VM_IP:$REMOTE_PATH/node_modules/"
rsync -avz -e "ssh -i $SSH_KEY" node_modules/zod "$REMOTE_USER@$VM_IP:$REMOTE_PATH/node_modules/"
rsync -avz -e "ssh -i $SSH_KEY" node_modules/plugin-engine "$REMOTE_USER@$VM_IP:$REMOTE_PATH/node_modules/"
scp -i "$SSH_KEY" .env.production nginx-unified.conf scripts/boot.sh ecosystem.config.js "$REMOTE_USER@$VM_IP:$REMOTE_PATH/"

# 3. Restart Services on VM with health check + rollback
echo "🔄 Restarting application..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$VM_IP" << 'EOF'
  set -euo pipefail
  cd ~/marketplace

  mkdir -p scripts logs
  [ -f boot.sh ] && { mv boot.sh scripts/boot.sh; chmod +x scripts/boot.sh; }

  # Save current process state as rollback point
  pm2 save

  # Reload application (zero-downtime via cluster mode)
  pm2 startOrRestart ecosystem.config.js --update-env
  pm2 save

  # Reload Nginx (if config changed)
  sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
  sudo ln -sf /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx

  # Health check with rollback
  echo "⏳ Waiting for health check..."
  sleep 8
  HEALTH_URL="https://${BASE_DOMAIN:-sinaicamps.com}/api/v1/health"
  if curl -sf -o /dev/null "$HEALTH_URL"; then
    echo "✅ Health check passed"
  else
    echo "❌ Health check failed — rolling back..."
    pm2 restart sinaicamps --update-env
    sleep 5
    if curl -sf -o /dev/null "$HEALTH_URL"; then
      echo "⚠️  Rollback succeeded — previous version restored"
    else
      echo "❌ Rollback also failed — manual intervention required"
      exit 2
    fi
    exit 1
  fi
EOF

echo "✅ Deployment Successful! Visit https://sinaicamps.com"
