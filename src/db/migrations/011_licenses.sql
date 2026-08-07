CREATE TABLE IF NOT EXISTS licenses (
  id_license TEXT PRIMARY KEY,
  denomination TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  device_id TEXT,
  max_devices INTEGER DEFAULT 3,
  active INTEGER DEFAULT 1,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
