-- Run once: npx wrangler d1 execute cro-compare --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS quotes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  service  TEXT NOT NULL,
  provider TEXT NOT NULL,
  price    REAL NOT NULL,      -- per unit
  currency TEXT NOT NULL,
  days     INTEGER,
  qty      INTEGER,
  created  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS quotes_recent ON quotes (id DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  kind     TEXT NOT NULL,
  service  TEXT,
  provider TEXT,
  message  TEXT NOT NULL,
  contact  TEXT,
  created  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Hashed-IP write counter for rate limiting. No raw IPs are stored.
CREATE TABLE IF NOT EXISTS rate (
  k TEXT NOT NULL,
  w INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (k, w)
);
