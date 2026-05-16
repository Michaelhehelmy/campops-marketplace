#!/bin/bash
# Production Deployment Script for Oracle VM
set -e

echo "Starting deployment..."
cd ~/marketplace

# Ensure directories
mkdir -p scripts logs

# Setup boot script
if [ -f boot.sh ]; then
  mv boot.sh scripts/boot.sh
  chmod +x scripts/boot.sh
fi

# Restart with PM2
pm2 restart sinaicamps || pm2 start server.js --name sinaicamps
pm2 save

# Reload Nginx
sudo cp ~/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo ln -sf /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete!"
