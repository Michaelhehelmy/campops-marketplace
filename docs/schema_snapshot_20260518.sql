CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, email_verified INTEGER, image TEXT, password TEXT, role TEXT, created_at INTEGER, updated_at INTEGER, is_verified INTEGER);
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, created_at INTEGER, updated_at INTEGER);
CREATE TABLE accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, access_token TEXT, refresh_token TEXT, id_token TEXT, expires_at INTEGER, password TEXT, created_at INTEGER, updated_at INTEGER);
CREATE TABLE verifications (id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER, updated_at INTEGER);
CREATE TABLE user_roles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, permissions TEXT);
CREATE TABLE plugin_ui_registry (id TEXT PRIMARY KEY, plugin_id TEXT NOT NULL, slot_name TEXT NOT NULL, component_id TEXT NOT NULL, property_id TEXT, config TEXT, created_at TEXT);
CREATE TABLE audit_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, resource_id TEXT, details TEXT, property_id TEXT, ip_address TEXT, created_at TEXT);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, full_name TEXT, bio TEXT, phone TEXT);
CREATE TABLE plugin_booking_rooms (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL DEFAULT 2,
    base_price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
CREATE TABLE plugin_booking_room_availability (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    date TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES plugin_booking_rooms(id) ON DELETE CASCADE
  );
CREATE TABLE plugin_financial_ops_commissions (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE plugin_loyalty_exchange_rates (
    currency_code TEXT NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    is_active BOOLEAN DEFAULT true
  );
CREATE TABLE plugin_loyalty_point_transactions (
    guest_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reference_id UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
  );
CREATE TABLE available_plugins (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, display_name TEXT, description TEXT, category TEXT, is_official INTEGER, is_active INTEGER, manifest TEXT, entry_point_url TEXT, config_schema TEXT, version TEXT, updated_at INTEGER);
CREATE TABLE properties (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, short_description TEXT, city TEXT, country TEXT, settings TEXT, branding TEXT, is_active INTEGER, owner_id TEXT, created_at INTEGER, subdomain TEXT, custom_domain TEXT, domain_verified INTEGER DEFAULT 0, plan TEXT, primary_image TEXT, is_featured INTEGER, rating REAL, amenities TEXT, price_per_night INTEGER, min_price_per_night INTEGER, currency_code TEXT DEFAULT 'USD', featured_order INTEGER);
CREATE TABLE property_staff (id TEXT PRIMARY KEY, property_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER);
CREATE TABLE marketplace_bookings (id TEXT PRIMARY KEY, property_id TEXT NOT NULL, room_type_id TEXT, guest_name TEXT NOT NULL, guest_email TEXT NOT NULL, check_in TEXT, check_out TEXT, total_amount_cents INTEGER NOT NULL, status TEXT, created_at INTEGER, booking_type TEXT, guest_count INTEGER, currency TEXT, stripe_payment_intent_id TEXT, stripe_checkout_session_id TEXT);
CREATE TABLE commission_rates (id TEXT PRIMARY KEY, property_id TEXT, rate_percentage REAL NOT NULL, flat_fee_cents INTEGER, applies_to TEXT, is_active INTEGER, created_at INTEGER, created_by TEXT);
CREATE TABLE commission_transactions (id TEXT PRIMARY KEY, booking_id TEXT, property_id TEXT, stripe_account_id TEXT, total_amount_cents INTEGER, commission_rate_used REAL, commission_amount_cents INTEGER, net_payout_cents INTEGER, currency TEXT, status TEXT, stripe_transfer_id TEXT, transferred_at INTEGER, created_at INTEGER);
CREATE TABLE stripe_connect_accounts (id TEXT PRIMARY KEY, property_id TEXT, owner_id TEXT, stripe_account_id TEXT, stripe_account_type TEXT, charges_enabled INTEGER, payouts_enabled INTEGER, country TEXT, currency TEXT, onboarding_complete INTEGER, created_at INTEGER);
CREATE TABLE payout_summaries (id TEXT PRIMARY KEY, property_id TEXT, owner_id TEXT, period_start TEXT, period_end TEXT, total_bookings INTEGER, total_revenue_cents INTEGER, total_commission_cents INTEGER, net_payout_cents INTEGER, currency TEXT, status TEXT, stripe_payout_id TEXT, paid_at INTEGER, created_at INTEGER);
CREATE TABLE property_plugins (id TEXT PRIMARY KEY, property_id TEXT NOT NULL, plugin_name TEXT NOT NULL, is_enabled INTEGER, config TEXT, installed_version TEXT, installed_by TEXT, last_disabled_at INTEGER, created_at INTEGER, UNIQUE(property_id, plugin_name));
CREATE TABLE plugin_assets (id TEXT PRIMARY KEY, plugin_name TEXT, asset_type TEXT, asset_url TEXT, target_location TEXT, load_order INTEGER, is_active INTEGER, created_at INTEGER);
CREATE TABLE plugin_analytics (id TEXT PRIMARY KEY, plugin_name TEXT, property_id TEXT, event_type TEXT, event_data TEXT, created_at INTEGER);
CREATE TABLE rooms (id TEXT PRIMARY KEY, property_id TEXT, name TEXT, type TEXT, status TEXT, created_at INTEGER);
CREATE TABLE room_types (id TEXT PRIMARY KEY, property_id TEXT, name TEXT, description TEXT, base_price_cents INTEGER, capacity INTEGER, created_at INTEGER);
CREATE TABLE reservations (id TEXT PRIMARY KEY, user_id TEXT, property_id TEXT, check_in TEXT, check_out TEXT, guest_count INTEGER, total_price REAL, status TEXT, created_at TEXT, guest_name TEXT, guest_email TEXT, notes TEXT);
CREATE TABLE stats (val INTEGER);
CREATE TABLE events (type TEXT);
CREATE TABLE test_table (id TEXT PRIMARY KEY, name TEXT, is_active INTEGER);
CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
CREATE TABLE coverage_test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
CREATE TABLE homepage_config (id TEXT PRIMARY KEY, config TEXT);
CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, icon TEXT, description TEXT, display_order INTEGER);
CREATE TABLE plugin_booking_bookings (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    adults INTEGER NOT NULL DEFAULT 2,
    children INTEGER NOT NULL DEFAULT 0,
    total_price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    special_requests TEXT,
    payment_provider TEXT DEFAULT 'stripe',
    payment_status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    checked_in_at INTEGER,
    checked_out_at INTEGER,
    FOREIGN KEY (room_id) REFERENCES plugin_booking_rooms(id) ON DELETE CASCADE
  );
CREATE TABLE plugin_crm_activities (
    guest_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    details TEXT,
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
CREATE TABLE plugin_pwa_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    last_updated TIMESTAMP
  );
CREATE TABLE plugin_pwa_subscriptions (
    guest_id UUID,
    endpoint TEXT NOT NULL,
    p256dh TEXT,
    auth TEXT,
    is_active BOOLEAN DEFAULT true
  );
CREATE TABLE plugin_resource_listings (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    location    TEXT,
    tier        TEXT DEFAULT 'basic',
    images      TEXT,
    is_active   INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 0,
    metadata    TEXT,
    created_at  TEXT,
    updated_at  TEXT
    );
CREATE TABLE plugin_test_probe_probes (
    key   TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT ''
  );
