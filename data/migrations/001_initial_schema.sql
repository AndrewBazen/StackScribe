CREATE TABLE
    IF NOT EXISTS archives (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    );

CREATE TABLE
    IF NOT EXISTS tomes (
        id TEXT PRIMARY KEY NOT NULL,
        archive_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (archive_id) REFERENCES archives(id) ON DELETE CASCADE
    );

CREATE TABLE
    IF NOT EXISTS entries (
        id TEXT PRIMARY KEY NOT NULL,
        tome_id TEXT NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (tome_id) REFERENCES tomes (id) ON DELETE CASCADE
    );

CREATE INDEX idx_tomes_archive_id ON tomes (archive_id);

CREATE INDEX idx_entries_tome_id ON entries (tome_id);

CREATE INDEX idx_archives_updated_at ON archives (updated_at);

CREATE INDEX idx_tomes_updated_at ON tomes (updated_at);

CREATE INDEX idx_entries_updated_at ON entries (updated_at);

CREATE TABLE
    IF NOT EXISTS user_sync_metadata (
        user_id TEXT NOT NULL PRIMARY KEY,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );