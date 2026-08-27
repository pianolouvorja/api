CREATE TABLE IF NOT EXISTS remote_sessions (
  code_hash TEXT PRIMARY KEY,
  payload_ciphertext TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_remote_sessions_expiry
  ON remote_sessions(expires_at);
