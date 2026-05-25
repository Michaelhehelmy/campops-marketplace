-- Create external_calendars table for OTA channel manager
CREATE TABLE IF NOT EXISTS external_calendars (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Index for fast room lookups
CREATE INDEX IF NOT EXISTS idx_external_calendars_room_id ON external_calendars(room_id);
