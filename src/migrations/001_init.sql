-- 001_init.sql
CREATE TABLE IF NOT EXISTS archives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tomes (
  id TEXT PRIMARY KEY,
  archive_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (archive_id) REFERENCES archives(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  tome_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tome_id) REFERENCES tomes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);