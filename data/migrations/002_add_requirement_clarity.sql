-- 002_add_requirement_clarity.sql
CREATE TABLE requirement_chunk (
    chunk_id      INTEGER PRIMARY KEY,
    note_id       INTEGER NOT NULL,
    text          TEXT    NOT NULL,
    start_offset  INTEGER NOT NULL,
    end_offset    INTEGER NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ambiguity_finding (
    finding_id        INTEGER PRIMARY KEY,
    chunk_id          INTEGER NOT NULL,
    kind              TEXT    NOT NULL,  -- e.g. 'VAGUENESS'
    phrase            TEXT    NOT NULL,
    suggested_rewrite TEXT    NOT NULL,
    clarifying_q      TEXT    NOT NULL,
    severity          INTEGER NOT NULL,  -- 1-5
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chunk_id) REFERENCES requirement_chunk(chunk_id)
);

ALTER TABLE entries
ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'generic'; -- 'generic', 'requirement', 'specification', 'meeting', 'design', 'implementation', 'test', 'other'

CREATE INDEX idx_entries_entry_type ON entries(entry_type);