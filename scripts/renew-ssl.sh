#!/bin/bash
# SSL Renewal Script for CampOps Marketplace
set -e

echo "Starting SSL renewal process..."

# Attempt to renew certificates
if certbot renew --quiet; then
    echo "Certificates checked/renewed successfully."
    
    # Reload Nginx to pick up new certificates
    if nginx -s reload; then
        echo "Nginx reloaded successfully."
    else
        echo "Error: Failed to reload Nginx."
        exit 1
    fi
else
    echo "Error: Certbot renewal failed."
    exit 1
fi

echo "SSL renewal script completed."
