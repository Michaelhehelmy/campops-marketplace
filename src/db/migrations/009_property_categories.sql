CREATE TABLE IF NOT EXISTS property_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(property_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_property_categories_property ON property_categories(property_id);
CREATE INDEX IF NOT EXISTS idx_property_categories_category ON property_categories(category_id);
