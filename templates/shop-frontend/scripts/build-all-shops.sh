#!/bin/bash
# Build frontend bundles for all active shops from the marketplace
# Usage: ./scripts/build-all-shops.sh [environment]
# Example: ./scripts/build-all-shops.sh production

set -e

ENVIRONMENT=${1:-production}
API_BASE="${VITE_API_BASE:-https://api.sinaicamps.com}"

echo "🔨 Building frontend bundles for all active shops"
echo "🌍 Environment: $ENVIRONMENT"
echo "🔗 API Base: $API_BASE"

# Fetch all active shops from marketplace
SHOPS=$(curl -s "$API_BASE/api/admin/shops?status=active&limit=1000" | jq -r '.shops[].slug // empty')

if [ -z "$SHOPS" ]; then
    echo "⚠️  No active shops found or API unavailable"
    echo "   Using demo shop for testing..."
    SHOPS="demo-camp"
fi

echo "📋 Found shops:"
echo "$SHOPS"
echo ""

# Build for each shop
for SHOP_SLUG in $SHOPS; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ./scripts/build-for-shop.sh "$SHOP_SLUG" "$ENVIRONMENT"
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All builds complete!"
echo ""
echo "📦 Built bundles:"
ls -la dist/
