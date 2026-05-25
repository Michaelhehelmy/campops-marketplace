-- Create external_calendars table for OTA integrations
CREATE TABLE IF NOT EXISTS external_calendars (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  ical_url TEXT,
  channel_id TEXT,
  credentials TEXT,
  last_synced_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_calendars_property ON external_calendars(property_id);
CREATE INDEX IF NOT EXISTS idx_external_calendars_platform ON external_calendars(platform);

-- Add ical_sync_url column to rooms table
ALTER TABLE rooms ADD COLUMN ical_sync_url TEXT;
