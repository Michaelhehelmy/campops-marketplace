#!/bin/bash
# Production Deployment Script for Oracle VM
set -e

echo "Starting deployment..."
cd ~/marketplace

# Export environment variables
export $(cat .env.production | xargs)

# Stop old container
sudo docker stop campops || true
sudo docker rm campops || true

# Run new container
sudo docker run -d --name campops \
  --network="host" \
  --restart always \
  --env-file .env.production \
  campops-marketplace:latest

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete!"
