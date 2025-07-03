-- Initial schema for local sqlite db

-- Archives belong to specific users
CREATE TABLE IF NOT EXISTS archives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Tomes belong to archives (and indirectly to users)
CREATE TABLE IF NOT EXISTS tomes (
    id TEXT PRIMARY KEY,
    archive_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (archive_id) REFERENCES archives(id) ON DELETE CASCADE
);

-- Entries belong to tomes (and indirectly to users)
CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    tome_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (tome_id) REFERENCES tomes(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_tomes_archive_id ON tomes(archive_id);
CREATE INDEX idx_entries_tome_id ON entries(tome_id);
CREATE INDEX idx_archives_updated_at ON archives(updated_at);
CREATE INDEX idx_tomes_updated_at ON tomes(updated_at);
CREATE INDEX idx_entries_updated_at ON entries(updated_at);

-- Per-user sync metadata table for server-side tracking
CREATE TABLE IF NOT EXISTS user_sync_metadata (
    user_id TEXT NOT NULL PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
