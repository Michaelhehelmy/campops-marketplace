-- SinaiCamps Marketplace PostgreSQL Schema
-- Optimized for production launch

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Authentication & Authorization
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    image TEXT,
    password TEXT,
    role TEXT DEFAULT 'guest',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    expires_at TIMESTAMPTZ,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    permissions JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    bio TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Core Marketplace Framework
CREATE TABLE IF NOT EXISTS available_plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    description TEXT,
    category TEXT,
    is_official BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    manifest JSONB DEFAULT '{}',
    entry_point_url TEXT,
    config_schema JSONB DEFAULT '{}',
    version TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    city TEXT,
    country TEXT,
    settings JSONB DEFAULT '{}',
    branding JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    owner_id TEXT REFERENCES users(id),
    subdomain TEXT,
    custom_domain TEXT,
    domain_verified BOOLEAN DEFAULT FALSE,
    plan TEXT DEFAULT 'basic',
    primary_image TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    rating REAL,
    amenities JSONB DEFAULT '[]',
    price_per_night INTEGER,
    min_price_per_night INTEGER,
    currency_code TEXT DEFAULT 'USD',
    featured_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_staff (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS property_plugins (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    plugin_name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    config JSONB DEFAULT '{}',
    installed_version TEXT,
    installed_by TEXT,
    last_disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, plugin_name)
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS homepage_config (
    id TEXT PRIMARY KEY,
    config JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    property_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Core Domain Tables (Plugin Owned, but often required for core consistency)
CREATE TABLE IF NOT EXISTS marketplace_bookings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    room_type_id TEXT,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    check_in DATE,
    check_out DATE,
    total_amount_cents INTEGER NOT NULL,
    status TEXT,
    booking_type TEXT,
    guest_count INTEGER,
    currency TEXT DEFAULT 'USD',
    stripe_payment_intent_id TEXT,
    stripe_checkout_session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_subdomain ON properties(subdomain);
CREATE INDEX IF NOT EXISTS idx_properties_custom_domain ON properties(custom_domain);
CREATE INDEX IF NOT EXISTS idx_property_staff_user ON property_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_property_plugins_property ON property_plugins(property_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_property ON audit_logs(property_id);

-- New Core Framework Tables
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    subdomain TEXT,
    custom_domain TEXT,
    domain_verified BOOLEAN DEFAULT FALSE,
    owner_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    post_type TEXT NOT NULL,
    post_status TEXT NOT NULL DEFAULT 'publish',
    post_slug TEXT,
    post_title TEXT NOT NULL DEFAULT '',
    post_content TEXT,
    author_id TEXT,
    parent_id TEXT,
    menu_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS postmeta (
    id SERIAL PRIMARY KEY,
    post_id TEXT NOT NULL,
    meta_key TEXT NOT NULL,
    meta_value TEXT
);

CREATE TABLE IF NOT EXISTS options (
    id SERIAL PRIMARY KEY,
    site_id TEXT NOT NULL,
    option_name TEXT NOT NULL,
    option_value TEXT,
    autoload BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS available_themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0.0',
    author TEXT,
    screenshot_url TEXT,
    theme_path TEXT NOT NULL,
    plan_requirement TEXT NOT NULL DEFAULT 'basic',
    is_active BOOLEAN DEFAULT TRUE,
    manifest TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS build_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    site_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    triggered_by TEXT,
    created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER,
    started_at INTEGER,
    finished_at INTEGER,
    error TEXT
);

CREATE TABLE IF NOT EXISTS plugin_submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    plugin_id TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    version TEXT NOT NULL,
    zip_url TEXT,
    manifest TEXT,
    review_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by TEXT,
    submitted_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER,
    reviewed_at INTEGER
);

-- Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_posts_site_type_status ON posts(site_id, post_type, post_status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(post_slug);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_postmeta_post_key ON postmeta(post_id, meta_key);
CREATE INDEX IF NOT EXISTS idx_options_site_name ON options(site_id, option_name);
CREATE INDEX IF NOT EXISTS idx_available_themes_name ON available_themes(name);
CREATE INDEX IF NOT EXISTS idx_available_themes_active ON available_themes(is_active);
CREATE INDEX IF NOT EXISTS idx_build_queue_site_id ON build_queue (site_id);
CREATE INDEX IF NOT EXISTS idx_build_queue_status  ON build_queue (status);
CREATE INDEX IF NOT EXISTS idx_plugin_submissions_plugin_id ON plugin_submissions(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_submissions_status    ON plugin_submissions(status);
CREATE INDEX IF NOT EXISTS idx_plugin_submissions_submitter ON plugin_submissions(submitted_by);
