#!/bin/bash
# Build script for deploying a specific shop's frontend bundle
# Usage: ./scripts/build-for-shop.sh <shop-slug> [environment]
# Example: ./scripts/build-for-shop.sh safari-camp production

set -e

SHOP_SLUG=${1:-}
ENVIRONMENT=${2:-production}

if [ -z "$SHOP_SLUG" ]; then
    echo "Error: Shop slug is required"
    echo "Usage: $0 <shop-slug> [environment]"
    echo "Example: $0 safari-camp production"
    exit 1
fi

echo "🔨 Building frontend bundle for shop: $SHOP_SLUG"
echo "🌍 Environment: $ENVIRONMENT"

# Set environment variables for this build
export VITE_SHOP_SLUG="$SHOP_SLUG"
export VITE_API_BASE="${VITE_API_BASE:-https://api.sinaicamps.com}"
export VITE_BUILD_MODE="shop"

# Determine output directory based on environment
if [ "$ENVIRONMENT" == "production" ]; then
    OUTPUT_DIR="dist/$SHOP_SLUG"
else
    OUTPUT_DIR="dist/staging/$SHOP_SLUG"
fi

echo "📦 Output directory: $OUTPUT_DIR"

# Clean previous build
rm -rf "$OUTPUT_DIR"

# Run the build (use npx to ensure local vite is found)
npx vite build --outDir "$OUTPUT_DIR" --mode "$ENVIRONMENT"

# Create a deployment manifest
cat > "$OUTPUT_DIR/shop-manifest.json" << EOF
{
  "shop_slug": "$SHOP_SLUG",
  "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "api_base": "$VITE_API_BASE",
  "build_mode": "shop"
}
EOF

echo "✅ Build complete for $SHOP_SLUG"
echo ""
echo "📋 Deployment manifest created:"
cat "$OUTPUT_DIR/shop-manifest.json"
echo ""
echo "🚀 To deploy, copy $OUTPUT_DIR to your web server and serve index.html"
echo "   The app will fetch its identity and branding from:"
echo "   $VITE_API_BASE/api/tenant/resolve?slug=$SHOP_SLUG"
