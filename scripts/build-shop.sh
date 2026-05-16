#!/bin/bash
#
# SinaiCamps Shop Build Script
# Builds a branded shop frontend using the template
#
# Usage: ./scripts/build-shop.sh <shop-slug> [environment] [api-base]
# Example: ./scripts/build-shop.sh safari-camp production https://api.sinaicamps.com
#

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_DIR="$PROJECT_ROOT/templates/shop-frontend"

# Arguments
SHOP_SLUG="${1:-}"
ENVIRONMENT="${2:-production}"
API_BASE="${3:-https://api.sinaicamps.com}"
OUTPUT_DIR="${4:-$PROJECT_ROOT/builds/$SHOP_SLUG}"

if [ -z "$SHOP_SLUG" ]; then
    echo "❌ Error: Shop slug is required"
    echo "Usage: $0 <shop-slug> [environment] [api-base] [output-dir]"
    echo "Example: $0 safari-camp production https://api.sinaicamps.com"
    exit 1
fi

echo "=========================================="
echo "🏕️  SinaiCamps Shop Build"
echo "=========================================="
echo "Shop:        $SHOP_SLUG"
echo "Environment: $ENVIRONMENT"
echo "API Base:    $API_BASE"
echo "Output:      $OUTPUT_DIR"
echo "Template:    $TEMPLATE_DIR"
echo "=========================================="
echo ""

# Check template exists
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "❌ Error: Template not found at $TEMPLATE_DIR"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "📡 Fetching branding from API..."
BRANDING_URL="$API_BASE/api/branding?slug=$SHOP_SLUG"
echo "   URL: $BRANDING_URL"

BRANDING_RESPONSE=$(curl -s "$BRANDING_URL" 2>/dev/null || echo "{}")

# Check if we got valid branding
if [ "$BRANDING_RESPONSE" = "{}" ] || [ -z "$BRANDING_RESPONSE" ]; then
    echo "⚠️  Warning: No branding found for '$SHOP_SLUG', using defaults"
fi

# Extract branding values using jq if available
if command -v jq &> /dev/null; then
    SHOP_NAME=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.name // .name // "'$SHOP_SLUG'"')
    SHOP_DESCRIPTION=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.description // ""')
    TAGLINE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.tagline // ""')
    
    # Colors
    PRIMARY_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.primary // "#0f172a"')
    SECONDARY_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.secondary // "#3b82f6"')
    ACCENT_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.accent // "#10b981"')
    
    # Images
    LOGO_URL=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.logo.url // ""')
    HERO_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.hero // ""')
    
    # Contact
    CONTACT_EMAIL=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.email // ""')
    CONTACT_PHONE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.phone // ""')
    
    # Business
    CURRENCY=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.business.currency // "USD"')
    TIMEZONE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.business.timezone // "UTC"')
else
    echo "⚠️  jq not found, using default values"
    SHOP_NAME="$SHOP_SLUG"
    SHOP_DESCRIPTION=""
    TAGLINE=""
    PRIMARY_COLOR="#0f172a"
    SECONDARY_COLOR="#3b82f6"
    ACCENT_COLOR="#10b981"
    LOGO_URL=""
    HERO_IMAGE=""
    CONTACT_EMAIL=""
    CONTACT_PHONE=""
    CURRENCY="USD"
    TIMEZONE="UTC"
fi

echo "   ✓ Shop Name: $SHOP_NAME"
echo ""

# Generate .env file
echo "📝 Generating .env file..."

cat > "$OUTPUT_DIR/.env" << EOF
# SinaiCamps Shop Environment Configuration
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Shop: $SHOP_SLUG

# ============================================
# SHOP IDENTITY
# ============================================
VITE_SHOP_SLUG=$SHOP_SLUG
VITE_SHOP_NAME="$SHOP_NAME"
VITE_SHOP_DESCRIPTION="$SHOP_DESCRIPTION"
VITE_TAGLINE="$TAGLINE"
VITE_API_BASE=$API_BASE

# ============================================
# VISUAL BRANDING
# ============================================
VITE_LOGO_URL=$LOGO_URL
VITE_HERO_IMAGE=$HERO_IMAGE
VITE_PRIMARY_COLOR=$PRIMARY_COLOR
VITE_SECONDARY_COLOR=$SECONDARY_COLOR
VITE_ACCENT_COLOR=$ACCENT_COLOR

# ============================================
# CONTACT
# ============================================
VITE_CONTACT_EMAIL=$CONTACT_EMAIL
VITE_CONTACT_PHONE=$CONTACT_PHONE

# ============================================
# BUSINESS
# ============================================
VITE_CURRENCY=$CURRENCY
VITE_TIMEZONE=$TIMEZONE

# ============================================
# BUILD CONFIG
# ============================================
VITE_BUILD_MODE=shop
VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "   ✓ .env file created"
echo ""

# Build the template
echo "🔨 Building shop frontend..."
echo "   Template: $TEMPLATE_DIR"
echo "   Output:   $OUTPUT_DIR/dist"
echo ""

cd "$TEMPLATE_DIR"

# Copy .env to template for build
cp "$OUTPUT_DIR/.env" .env.local

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build
npm run build -- --outDir "$OUTPUT_DIR/dist" --mode "$ENVIRONMENT"

# Clean up
cp "$OUTPUT_DIR/.env" "$OUTPUT_DIR/dist/.env.example"
rm -f .env.local

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output: $OUTPUT_DIR/dist"
echo "🚀 Deploy: rsync -av $OUTPUT_DIR/dist/ /var/www/shops/$SHOP_SLUG/"
echo ""

# Create deployment info
cat > "$OUTPUT_DIR/deployment-info.json" << EOF
{
  "shop_slug": "$SHOP_SLUG",
  "shop_name": "$SHOP_NAME",
  "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "api_base": "$API_BASE",
  "output_dir": "$OUTPUT_DIR/dist",
  "primary_color": "$PRIMARY_COLOR",
  "logo_url": "$LOGO_URL"
}
EOF

echo "📄 Deployment info: $OUTPUT_DIR/deployment-info.json"
echo ""
echo "Done! 🎉"
