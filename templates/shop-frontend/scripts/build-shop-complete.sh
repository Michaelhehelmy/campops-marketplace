#!/bin/bash
# Complete Shop Build Script
# Fetches branding from API, generates .env, and builds full frontend
# Usage: ./scripts/build-shop-complete.sh <shop-slug> [environment] [api-base]
# Example: ./scripts/build-shop-complete.sh safari-camp production https://api.sinaicamps.com

set -e

SHOP_SLUG=${1:-}
ENVIRONMENT=${2:-production}
API_BASE=${3:-${VITE_API_BASE:-https://api.sinaicamps.com}}

if [ -z "$SHOP_SLUG" ]; then
    echo "Error: Shop slug is required"
    echo "Usage: $0 <shop-slug> [environment] [api-base]"
    echo "Example: $0 safari-camp production https://api.sinaicamps.com"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  🏕️  Building Complete Camp Shop: $SHOP_SLUG"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Determine output directory
if [ "$ENVIRONMENT" == "production" ]; then
    OUTPUT_DIR="dist/$SHOP_SLUG"
else
    OUTPUT_DIR="dist/staging/$SHOP_SLUG"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "📡 Fetching branding from API..."

# Fetch branding from API
BRANDING_RESPONSE=$(curl -s "$API_BASE/api/branding?slug=$SHOP_SLUG" 2>/dev/null || echo '{}')

# Check if we got valid branding
if echo "$BRANDING_RESPONSE" | grep -q '"error"'; then
    echo "⚠️  Warning: Could not fetch branding from API"
    echo "   Response: $BRANDING_RESPONSE"
    echo "   Continuing with defaults..."
    SHOP_NAME="$SHOP_SLUG"
    SHOP_DESCRIPTION=""
else
    # Extract values using jq if available, otherwise use grep/sed
    if command -v jq &> /dev/null; then
        # === BASIC IDENTITY ===
        SHOP_NAME=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.name // .name // "'$SHOP_SLUG'"')
        SHOP_DESCRIPTION=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.description // ""')
        SHORT_DESCRIPTION=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.shortDescription // ""')
        TAGLINE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.tagline // ""')
        
        # === LOGOS ===
        LOGO_URL=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.logo.url // ""')
        LOGO_DARK_URL=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.logo.darkUrl // ""')
        FAVICON_URL=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.logo.favicon // "/favicon.ico"')
        
        # === IMAGES ===
        HERO_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.hero // ""')
        BANNER_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.banner // ""')
        THUMBNAIL_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.thumbnail // ""')
        DASHBOARD_HERO=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.dashboardHero // ""')
        HUT_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.hut // ""')
        KITCHEN_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.kitchen // ""')
        DESERT_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.desert // ""')
        STARS_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.stars // ""')
        SINAI_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.sinaiLandscape // ""')
        SUNSET_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.sunset // ""')
        CABIN_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.cabin // ""')
        MOUNTAIN_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.mountain // ""')
        BEACH_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.beach // ""')
        ROOM_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.images.roomInterior // ""')
        
        # === COLORS ===
        PRIMARY_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.primary // "#0f172a"')
        SECONDARY_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.secondary // "#3b82f6"')
        ACCENT_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.accent // "#10b981"')
        BACKGROUND_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.background // "#ffffff"')
        SURFACE_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.surface // "#f8fafc"')
        TEXT_COLOR=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.text // "#1e293b"')
        TEXT_MUTED=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.colors.textMuted // "#64748b"')
        
        # === TYPOGRAPHY ===
        HEADING_FONT=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.typography.headingFont // "Inter"')
        BODY_FONT=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.typography.bodyFont // "Inter"')
        
        # === CONTACT ===
        CONTACT_EMAIL=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.email // ""')
        CONTACT_PHONE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.phone // ""')
        CONTACT_WEBSITE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.website // ""')
        CONTACT_ADDRESS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.address // ""')
        
        # === SOCIAL ===
        SOCIAL_FB=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.social.facebook // ""')
        SOCIAL_IG=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.social.instagram // ""')
        SOCIAL_TW=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.social.twitter // ""')
        SOCIAL_YT=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.social.youtube // ""')
        SOCIAL_LI=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.social.linkedin // ""')
        SOCIAL_TT=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.contact.social.tiktok // ""')
        
        # === SEO ===
        SEO_TITLE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.seo.title // ""')
        SEO_DESC=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.seo.description // ""')
        SEO_KEYWORDS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.seo.keywords | join(",") // ""')
        SEO_OG_IMAGE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.seo.ogImage // ""')
        
        # === THEME ===
        THEME_MODE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.theme.mode // "light"')
        
        # === FEATURES ===
        FEAT_BOOKINGS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.bookings // true')
        FEAT_PAYMENTS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.payments // true')
        FEAT_REVIEWS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.reviews // true')
        FEAT_LOYALTY=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.loyalty // false')
        FEAT_POS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.pos // false')
        FEAT_EXCURSIONS=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.excursions // true')
        FEAT_BLOG=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.features.blog // false')
        
        # === LABELS ===
        LABEL_LOGIN=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.labels.loginButton // "Enter '$SHOP_NAME'"')
        LABEL_WELCOME=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.labels.welcomeMessage // "Welcome to '$SHOP_NAME'"')
        LABEL_BOOK=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.labels.bookNow // "Book Now"')
        
        # === BUSINESS ===
        CHECKIN_TIME=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.business.checkinTime // "14:00"')
        CHECKOUT_TIME=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.business.checkoutTime // "11:00"')
        TIMEZONE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.business.timezone // "UTC"')
        CURRENCY=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.business.currency // "USD"')
        
        # === LOCATION ===
        LATITUDE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.location.latitude // 0')
        LONGITUDE=$(echo "$BRANDING_RESPONSE" | jq -r '.branding.location.longitude // 0')
    else
        # Fallback without jq - basic fields only
        SHOP_NAME=$(echo "$BRANDING_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
        SHOP_NAME="${SHOP_NAME:-$SHOP_SLUG}"
        SHOP_DESCRIPTION=""
        SHORT_DESCRIPTION=""
        TAGLINE=""
        LOGO_URL=""
        LOGO_DARK_URL=""
        FAVICON_URL="/favicon.ico"
        HERO_IMAGE=""
        BANNER_IMAGE=""
        THUMBNAIL_IMAGE=""
        DASHBOARD_HERO=""
        HUT_IMAGE=""
        KITCHEN_IMAGE=""
        DESERT_IMAGE=""
        STARS_IMAGE=""
        SINAI_IMAGE=""
        SUNSET_IMAGE=""
        CABIN_IMAGE=""
        MOUNTAIN_IMAGE=""
        BEACH_IMAGE=""
        ROOM_IMAGE=""
        PRIMARY_COLOR="#0f172a"
        SECONDARY_COLOR="#3b82f6"
        ACCENT_COLOR="#10b981"
        BACKGROUND_COLOR="#ffffff"
        SURFACE_COLOR="#f8fafc"
        TEXT_COLOR="#1e293b"
        TEXT_MUTED="#64748b"
        HEADING_FONT="Inter"
        BODY_FONT="Inter"
        CONTACT_EMAIL=""
        CONTACT_PHONE=""
        CONTACT_WEBSITE=""
        CONTACT_ADDRESS=""
        SOCIAL_FB=""
        SOCIAL_IG=""
        SOCIAL_TW=""
        SOCIAL_YT=""
        SOCIAL_LI=""
        SOCIAL_TT=""
        SEO_TITLE=""
        SEO_DESC=""
        SEO_KEYWORDS=""
        SEO_OG_IMAGE=""
        THEME_MODE="light"
        FEAT_BOOKINGS="true"
        FEAT_PAYMENTS="true"
        FEAT_REVIEWS="true"
        FEAT_LOYALTY="false"
        FEAT_POS="false"
        FEAT_EXCURSIONS="true"
        FEAT_BLOG="false"
        LABEL_LOGIN="Enter $SHOP_NAME"
        LABEL_WELCOME="Welcome to $SHOP_NAME"
        LABEL_BOOK="Book Now"
        CHECKIN_TIME="14:00"
        CHECKOUT_TIME="11:00"
        TIMEZONE="UTC"
        CURRENCY="USD"
        LATITUDE="0"
        LONGITUDE="0"
    fi
fi

echo "   ✓ Shop Name: $SHOP_NAME"
echo ""

# Generate .env file
echo "📝 Generating .env file..."

cat > "$OUTPUT_DIR/.env" << EOF
# Camp Shop Environment Configuration
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Shop: $SHOP_SLUG

# ============================================
# SHOP IDENTITY
# ============================================
VITE_SHOP_SLUG=$SHOP_SLUG
VITE_SHOP_NAME="$SHOP_NAME"
VITE_SHOP_DESCRIPTION="$SHOP_DESCRIPTION"
VITE_SHORT_DESCRIPTION="$SHORT_DESCRIPTION"
VITE_TAGLINE="$TAGLINE"
VITE_API_BASE=$API_BASE

# ============================================
# LOGOS
# ============================================
VITE_LOGO_URL=$LOGO_URL
VITE_LOGO_DARK_URL=$LOGO_DARK_URL
VITE_FAVICON_URL=$FAVICON_URL

# ============================================
# IMAGES (14 configurable images)
# ============================================
VITE_HERO_IMAGE=$HERO_IMAGE
VITE_BANNER_IMAGE=$BANNER_IMAGE
VITE_THUMBNAIL_IMAGE=$THUMBNAIL_IMAGE
VITE_IMG_DASHBOARD_HERO=$DASHBOARD_HERO
VITE_IMG_HUT=$HUT_IMAGE
VITE_IMG_KITCHEN=$KITCHEN_IMAGE
VITE_IMG_DESERT=$DESERT_IMAGE
VITE_IMG_STARS=$STARS_IMAGE
VITE_IMG_SINAI_LANDSCAPE=$SINAI_IMAGE
VITE_IMG_SUNSET=$SUNSET_IMAGE
VITE_IMG_CABIN=$CABIN_IMAGE
VITE_IMG_MOUNTAIN=$MOUNTAIN_IMAGE
VITE_IMG_BEACH=$BEACH_IMAGE
VITE_IMG_ROOM_INTERIOR=$ROOM_IMAGE

# ============================================
# COLORS (Full theme palette)
# ============================================
VITE_PRIMARY_COLOR=$PRIMARY_COLOR
VITE_SECONDARY_COLOR=$SECONDARY_COLOR
VITE_ACCENT_COLOR=$ACCENT_COLOR
VITE_BACKGROUND_COLOR=$BACKGROUND_COLOR
VITE_SURFACE_COLOR=$SURFACE_COLOR
VITE_TEXT_COLOR=$TEXT_COLOR
VITE_TEXT_MUTED=$TEXT_MUTED

# ============================================
# TYPOGRAPHY
# ============================================
VITE_HEADING_FONT=$HEADING_FONT
VITE_BODY_FONT=$BODY_FONT

# ============================================
# CONTACT (Full contact details)
# ============================================
VITE_CONTACT_EMAIL=$CONTACT_EMAIL
VITE_CONTACT_PHONE=$CONTACT_PHONE
VITE_CONTACT_WEBSITE=$CONTACT_WEBSITE
VITE_CONTACT_ADDRESS="$CONTACT_ADDRESS"

# ============================================
# SOCIAL MEDIA
# ============================================
VITE_SOCIAL_FACEBOOK=$SOCIAL_FB
VITE_SOCIAL_INSTAGRAM=$SOCIAL_IG
VITE_SOCIAL_TWITTER=$SOCIAL_TW
VITE_SOCIAL_YOUTUBE=$SOCIAL_YT
VITE_SOCIAL_LINKEDIN=$SOCIAL_LI
VITE_SOCIAL_TIKTOK=$SOCIAL_TT

# ============================================
# SEO
# ============================================
VITE_SEO_TITLE="$SEO_TITLE"
VITE_SEO_DESCRIPTION="$SEO_DESC"
VITE_SEO_KEYWORDS="$SEO_KEYWORDS"
VITE_SEO_OG_IMAGE=$SEO_OG_IMAGE

# ============================================
# THEME MODE
# ============================================
VITE_THEME_MODE=$THEME_MODE

# ============================================
# FEATURES (Toggleable per shop)
# ============================================
VITE_ENABLE_BOOKINGS=$FEAT_BOOKINGS
VITE_ENABLE_PAYMENTS=$FEAT_PAYMENTS
VITE_ENABLE_REVIEWS=$FEAT_REVIEWS
VITE_ENABLE_LOYALTY=$FEAT_LOYALTY
VITE_ENABLE_POS=$FEAT_POS
VITE_ENABLE_EXCURSIONS=$FEAT_EXCURSIONS
VITE_ENABLE_BLOG=$FEAT_BLOG
VITE_ENABLE_ADMIN=true
VITE_ENABLE_STAFF=true
VITE_ENABLE_GUEST=true

# ============================================
# CUSTOM LABELS
# ============================================
VITE_APP_LOGIN_LABEL="$LABEL_LOGIN"
VITE_APP_WELCOME_MESSAGE="$LABEL_WELCOME"
VITE_APP_BOOK_BUTTON="$LABEL_BOOK"

# ============================================
# BUSINESS INFO
# ============================================
VITE_CHECKIN_TIME=$CHECKIN_TIME
VITE_CHECKOUT_TIME=$CHECKOUT_TIME
VITE_TIMEZONE=$TIMEZONE
VITE_CURRENCY=$CURRENCY

# ============================================
# LOCATION
# ============================================
VITE_LATITUDE=$LATITUDE
VITE_LONGITUDE=$LONGITUDE

# ============================================
# BUILD CONFIG
# ============================================
VITE_BUILD_MODE=shop
VITE_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "   ✓ .env file created at $OUTPUT_DIR/.env"
echo ""

# Copy .env to project root temporarily for build
cp "$OUTPUT_DIR/.env" .env.local

# Export environment variables for build
export VITE_SHOP_SLUG="$SHOP_SLUG"
export VITE_SHOP_NAME="$SHOP_NAME"
export VITE_API_BASE="$API_BASE"
export VITE_BUILD_MODE="shop"
export VITE_PRIMARY_COLOR="$PRIMARY_COLOR"
export VITE_LOGO_URL="$LOGO_URL"

echo "🔨 Building frontend..."
echo "   Output: $OUTPUT_DIR"
echo ""

# Clean and build
rm -rf "${OUTPUT_DIR:?}"/*
npx vite build --outDir "$OUTPUT_DIR" --mode "$ENVIRONMENT"

echo ""
echo "📦 Creating deployment files..."

# Create shop manifest with all branding
cat > "$OUTPUT_DIR/shop-manifest.json" << EOF
{
  "shop_slug": "$SHOP_SLUG",
  "shop_name": "$SHOP_NAME",
  "shop_description": "$SHOP_DESCRIPTION",
  "short_description": "$SHORT_DESCRIPTION",
  "tagline": "$TAGLINE",
  "build_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "api_base": "$API_BASE",
  "build_mode": "shop",
  "branding": {
    "logo_url": "$LOGO_URL",
    "logo_dark_url": "$LOGO_DARK_URL",
    "favicon_url": "$FAVICON_URL",
    "hero_image": "$HERO_IMAGE",
    "primary_color": "$PRIMARY_COLOR",
    "secondary_color": "$SECONDARY_COLOR",
    "accent_color": "$ACCENT_COLOR"
  },
  "contact": {
    "email": "$CONTACT_EMAIL",
    "phone": "$CONTACT_PHONE",
    "website": "$CONTACT_WEBSITE"
  },
  "business": {
    "currency": "$CURRENCY",
    "timezone": "$TIMEZONE",
    "checkin_time": "$CHECKIN_TIME",
    "checkout_time": "$CHECKOUT_TIME"
  },
  "features": {
    "bookings": $FEAT_BOOKINGS,
    "payments": $FEAT_PAYMENTS,
    "reviews": $FEAT_REVIEWS,
    "loyalty": $FEAT_LOYALTY,
    "pos": $FEAT_POS,
    "excursions": $FEAT_EXCURSIONS,
    "blog": $FEAT_BLOG,
    "admin": true,
    "staff": true,
    "guest": true
  }
}
EOF

# Create nginx config for this shop
cat > "$OUTPUT_DIR/nginx.conf" << 'EOF'
# Nginx configuration for camp shop
# Place this in /etc/nginx/conf.d/

server {
    listen 80;
    server_name {{SHOP_SUBDOMAIN}}.sinaicamps.com {{SHOP_DOMAIN}};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name {{SHOP_SUBDOMAIN}}.sinaicamps.com {{SHOP_DOMAIN}};
    
    root /var/www/shops/{{SHOP_SLUG}};
    index index.html;
    
    # SSL certificates
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets (1 year)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Cache manifest (1 hour)
    location ~* \.(webmanifest|json)$ {
        expires 1h;
        add_header Cache-Control "public";
        try_files $uri =404;
    }
    
    # Service worker - no cache
    location = /sw.js {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }
    
    # All routes -> index.html (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    # Proxy API calls to marketplace backend
    location /api/ {
        proxy_pass {{API_BASE}}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Create deployment README
cat > "$OUTPUT_DIR/DEPLOY.md" << EOF
# Deployment Guide for $SHOP_NAME ($SHOP_SLUG)

## Files in this directory:
- \`index.html\` - Main entry point
- \`assets/\` - Static assets (JS, CSS, images)
- \`.env\` - Environment configuration
- \`shop-manifest.json\` - Build metadata
- \`nginx.conf\` - Nginx server configuration
- \`sw.js\` - Service worker for PWA

## Quick Deploy:

### Option 1: Nginx (Self-hosted)
\`\`\`bash
# Copy files to web server
sudo mkdir -p /var/www/shops/$SHOP_SLUG
sudo cp -r dist/$SHOP_SLUG/* /var/www/shops/$SHOP_SLUG/

# Update nginx config (replace variables)
sudo cp dist/$SHOP_SLUG/nginx.conf /etc/nginx/conf.d/$SHOP_SLUG.conf
# Edit: replace {{SHOP_SLUG}}, {{SHOP_SUBDOMAIN}}, {{SHOP_DOMAIN}}, {{API_BASE}}

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
\`\`\`

### Option 2: Static Hosting (Netlify, Vercel, etc.)
\`\`\`bash
# Deploy to Netlify
npx netlify deploy --dir=dist/$SHOP_SLUG --prod

# Or to Vercel
cd dist/$SHOP_SLUG && npx vercel --prod
\`\`\`

## Environment Variables:
All branding and configuration is embedded at build time via:
- \`VITE_SHOP_SLUG\` - Shop identifier
- \`VITE_SHOP_NAME\` - Display name
- \`VITE_API_BASE\` - Backend API URL

## Features Enabled:
✓ Guest bookings
✓ Payment processing
✓ Reviews
✓ Admin dashboard
✓ Staff management
✓ Public pages

## Post-Deploy:
1. Configure DNS: $SHOP_SLUG.sinaicamps.com → your server
2. Test at: https://$SHOP_SLUG.sinaicamps.com
3. Verify branding loads from API
4. Test all user roles (guest, admin, staff)

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

# Clean up temporary .env
cp .env.local "$OUTPUT_DIR/.env.local"
rm .env.local

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Build Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📁 Output: $OUTPUT_DIR/"
echo ""
echo "📋 Files created:"
echo "   • index.html + assets (frontend bundle)"
echo "   • .env (environment config)"
echo "   • .env.local (backup)"
echo "   • shop-manifest.json (metadata)"
echo "   • nginx.conf (server config)"
echo "   • DEPLOY.md (deployment guide)"
echo ""
echo "🚀 Next steps:"
echo "   1. Copy $OUTPUT_DIR/ to your web server"
echo "   2. Configure nginx using $OUTPUT_DIR/nginx.conf"
echo "   3. Set up DNS: $SHOP_SLUG.sinaicamps.com"
echo "   4. See $OUTPUT_DIR/DEPLOY.md for full instructions"
echo ""
echo "🌐 Shop will be available at:"
echo "   https://$SHOP_SLUG.sinaicamps.com"
echo ""
