-- 002_add_requirement_clarity.sql
CREATE TABLE IF NOT EXISTS requirement_chunk (
    chunk_id      INTEGER PRIMARY KEY,
    note_id      TEXT NOT NULL,
    text          TEXT    NOT NULL,
    start_offset  INTEGER NOT NULL,
    end_offset    INTEGER NOT NULL,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (note_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ambiguity_finding (
    finding_id        INTEGER PRIMARY KEY,
    chunk_id          INTEGER NOT NULL,
    kind              TEXT    NOT NULL,  -- e.g. 'VAGUENESS'
    phrase            TEXT    NOT NULL,
    suggested_rewrite TEXT    NOT NULL,
    clarifying_q      TEXT    NOT NULL,
    severity          INTEGER NOT NULL,  -- 1-5
    created_at        TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chunk_id) REFERENCES requirement_chunk(chunk_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_requirement_chunk_note_id ON requirement_chunk(note_id);

CREATE INDEX IF NOT EXISTS idx_ambiguity_finding_chunk_id ON ambiguity_finding(chunk_id);

CREATE INDEX IF NOT EXISTS idx_ambiguity_finding_kind ON ambiguity_finding(kind);

CREATE INDEX IF NOT EXISTS idx_ambiguity_finding_severity ON ambiguity_finding(severity);

CREATE INDEX IF NOT EXISTS idx_ambiguity_finding_created_at ON ambiguity_finding(created_at);

CREATE INDEX IF NOT EXISTS idx_requirement_chunk_created_at ON requirement_chunk(created_at);