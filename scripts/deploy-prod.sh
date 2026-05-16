#!/bin/bash
# Production Deployment Script for Oracle VM
set -e

echo "Starting deployment..."
cd ~/marketplace

# Export environment variables
export $(cat .env.production | xargs)

# Stop old container
sudo docker stop sinaicamps || true
sudo docker rm sinaicamps || true

# Run new container
sudo docker run -d --name sinaicamps \
  --network="host" \
  --restart always \
  --env-file .env.production \
  sinaicamps-marketplace:latest

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete!"
