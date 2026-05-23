#!/bin/bash
set -e

# 1. Backup old per-domain configs
echo "Backing up old per-domain nginx configs..."
sudo mv /etc/nginx/conf.d/my-camp.conf /etc/nginx/conf.d/my-camp.conf.bak 2>/dev/null || true
sudo mv /etc/nginx/conf.d/safari-camp.conf /etc/nginx/conf.d/safari-camp.conf.bak 2>/dev/null || true
sudo mv /etc/nginx/conf.d/sinaicamps.conf /etc/nginx/conf.d/sinaicamps.conf.bak 2>/dev/null || true
sudo mv /etc/nginx/conf.d/acaciacamp.conf /etc/nginx/conf.d/acaciacamp.conf.bak 2>/dev/null || true

# 2. Remove old tenants.d directory and sites-enabled files
sudo rm -rf /etc/nginx/tenants.d 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo rm -f /etc/nginx/conf.d/my-camp.conf /etc/nginx/conf.d/safari-camp.conf /etc/nginx/conf.d/unified.conf 2>/dev/null || true

# 3. Copy the unified catch-all config to sites-available & enable it
echo "Installing unified catch-all Nginx config..."
sudo cp /home/ubuntu/marketplace/nginx-unified.conf /etc/nginx/sites-available/sinaicamps
sudo ln -sf /etc/nginx/sites-available/sinaicamps /etc/nginx/sites-enabled/

# 5. Test nginx config
echo "Testing nginx configuration..."
sudo nginx -t

# 6. Enable and start nginx
echo "Enabling and starting nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

# 7. Verify
echo ""
echo "Nginx status:"
sudo systemctl status nginx --no-pager | head -15

echo ""
echo "Listening ports:"
ss -tlnp | grep -E '80|443|3000'

echo ""
echo "=== Deployment fix complete ==="
echo "Nginx now proxies all domains -> http://localhost:3000"
echo "SSL termination is handled by Cloudflare at the edge."
