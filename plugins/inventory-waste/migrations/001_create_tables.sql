-- Create inventory and waste tables
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  quantity REAL DEFAULT 0,
  par_level REAL DEFAULT 0,
  reorder_point REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waste_log (
  id TEXT PRIMARY KEY,
  inventory_item_id TEXT,
  item TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT,
  reason TEXT,
  cost REAL DEFAULT 0,
  date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_waste_log_date ON waste_log(date);
