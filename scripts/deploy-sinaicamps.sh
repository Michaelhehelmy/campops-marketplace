#!/bin/bash
# SinaiCamps Master Deployment Script
# Run this from your LOCAL machine to update the Oracle VM.

# Configuration
VM_IP="84.235.239.6"
SSH_KEY="/home/michael/Downloads/oracle.key"
REMOTE_USER="ubuntu"
REMOTE_PATH="~/marketplace"

echo "🚀 Starting Deployment to SinaiCamps ($VM_IP)..."

# 1. Sync Files
echo "📦 Syncing files..."
rsync -avz -e "ssh -i $SSH_KEY" .next/standalone/ $REMOTE_USER@$VM_IP:$REMOTE_PATH/
rsync -avz -e "ssh -i $SSH_KEY" .next/static/ $REMOTE_USER@$VM_IP:$REMOTE_PATH/.next/static/
rsync -avz -e "ssh -i $SSH_KEY" public/ $REMOTE_USER@$VM_IP:$REMOTE_PATH/public/
rsync -avz -e "ssh -i $SSH_KEY" plugins/ $REMOTE_USER@$VM_IP:$REMOTE_PATH/plugins/
scp -i $SSH_KEY .env.production nginx-unified.conf scripts/boot.sh ecosystem.config.js $REMOTE_USER@$VM_IP:$REMOTE_PATH/

# 2. Restart Services on VM
echo "🔄 Restarting application..."
ssh -i $SSH_KEY $REMOTE_USER@$VM_IP << 'EOF'
  cd ~/marketplace
  # Update permissions for the boot script
  mkdir -p scripts logs
  mv boot.sh scripts/boot.sh
  chmod +x scripts/boot.sh
  
  # Refresh PM2 from ecosystem config
  pm2 startOrRestart ecosystem.config.js --update-env
  pm2 save
  
  # Reload Nginx (if config changed)
  sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
  sudo ln -sf /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/
  sudo nginx -t && sudo systemctl reload nginx
EOF

echo "✅ Deployment Successful! Visit https://sinaicamps.com"
