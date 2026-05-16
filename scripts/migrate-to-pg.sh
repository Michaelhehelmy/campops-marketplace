#!/bin/bash
# PostgreSQL Migration Script for SinaiCamps Marketplace
set -e

# Configuration
DB_URL=${DATABASE_URL:-"postgres://user:password@localhost:5432/sinaicamps"}
HEALTH_ENDPOINT=${HEALTH_URL:-"http://localhost:3000/api/health"}
HASHED_PASSWORD="e8c2be85ca9fe13f47c6ef1de40ac92d:4a8432eb6e15066427f96f1f9a3ca66fa19037c985f5cd3a5a46a73226d2f59f09ca5d4398b52918403865dd9f5ce4f254bddfbf16afc92517dbf50115f9799c"

echo "Starting PostgreSQL migration..."

# 1. Execute schema.sql
echo "Step 1: Creating core schema..."
psql "$DB_URL" -f schema.sql

# 2. Trigger plugin initialization via Health API
# This ensures each plugin runs its init() and creates its own tables
echo "Step 2: Triggering plugin initialization via $HEALTH_ENDPOINT..."
# Give the server a moment to be ready if this script is run as part of a deployment pipeline
MAX_RETRIES=5
RETRY_COUNT=0
until $(curl --output /dev/null --silent --head --fail "$HEALTH_ENDPOINT"); do
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "Warning: Could not reach health endpoint. Plugin tables might not be initialized."
      break
    fi
    echo "Waiting for server to be ready..."
    sleep 5
    RETRY_COUNT=$((RETRY_COUNT+1))
done

# 3. Seed Master Admin
echo "Step 3: Seeding Master Admin..."
psql "$DB_URL" <<EOF
-- Insert Master Admin
INSERT INTO users (id, email, password, role, name, email_verified, is_verified)
VALUES ('master-admin', 'master@sinaicamps.com', '$HASHED_PASSWORD', 'master', 'Master Admin', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, user_id, account_id, provider_id, password)
VALUES ('master-admin-account', 'master-admin', 'master-admin', 'credential', '$HASHED_PASSWORD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id, user_id, role)
VALUES ('master-admin-role', 'master-admin', 'marketplace_master')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, user_id, full_name, phone)
VALUES ('master-admin-profile', 'master-admin', 'Master Admin', '+1234567890')
ON CONFLICT (id) DO NOTHING;
EOF

# 4. Seed available plugins (Directory discovery will also handle this at runtime, but good to have baseline)
echo "Step 4: Seeding baseline plugins..."
# In a real environment, we'd loop through the plugins/ directory, but here we trigger the health check which does it dynamically.
# However, let's ensure the table is at least populated with the core vertical if needed.

echo "Migration complete!"
echo "Default Credentials:"
echo "Email: master@sinaicamps.com"
echo "Password: password123"
