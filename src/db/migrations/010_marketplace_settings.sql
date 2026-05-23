-- Create marketplace_settings table for storing platform-wide configuration
CREATE TABLE IF NOT EXISTS marketplace_settings (
    id TEXT PRIMARY KEY DEFAULT 'marketplace_settings',
    platform_name TEXT NOT NULL DEFAULT 'SinaiCamps Marketplace',
    support_email TEXT NOT NULL DEFAULT 'support@sinaicamps.com',
    currency TEXT NOT NULL DEFAULT 'USD',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    commission_rate REAL NOT NULL DEFAULT 10.0,
    min_booking_fee REAL NOT NULL DEFAULT 1.5,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Insert default record if it doesn't exist
INSERT OR IGNORE INTO marketplace_settings (id, platform_name, support_email, currency, timezone, commission_rate, min_booking_fee)
VALUES ('marketplace_settings', 'SinaiCamps Marketplace', 'support@sinaicamps.com', 'USD', 'UTC', 10.0, 1.5);