use rusqlite::{Connection, Result, params, OptionalExtension};
use serde::{Deserialize, Serialize};

// Data models matching your TypeScript types
#[derive(Debug, Serialize, Deserialize)]
pub struct Archive {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tome {
    pub id: String,
    pub archive_id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub tome_id: String,
    pub name: String,
    pub content: String,
    pub entry_type: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let mut conn = Connection::open(db_path)?;
        
        // Run migrations
        Self::run_migrations(&mut conn)?;
        
        Ok(Database { conn })
    }
    
    fn run_migrations(conn: &mut Connection) -> Result<()> {
        // Create migrations table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY,
                version INTEGER NOT NULL,
                description TEXT NOT NULL,
                applied_at TEXT DEFAULT (datetime('now'))
            )",
            []
        )?;
        
        // Get applied migrations
        let applied_versions: Vec<i32> = {
            let mut stmt = conn.prepare("SELECT version FROM migrations ORDER BY version")?;
            let versions = stmt.query_map([], |row| row.get(0))?.collect::<Result<Vec<_>>>()?;
            drop(stmt);
            versions
        };
        
        // Define migrations
        let migrations = vec![
            (1, "Initial schema", include_str!("../../data/migrations/001_initial_schema.sql")),
            (2, "Add requirement clarity", include_str!("../../data/migrations/002_add_requirement_clarity.sql")),
        ];
        
        // Apply pending migrations
        for (version, description, sql) in migrations {
            if !applied_versions.contains(&version) {
                println!("📄 Applying migration {}: {}", version, description);
                
                // Start transaction for this migration
                let tx = conn.transaction()?;
                
                // Execute the migration SQL
                tx.execute_batch(sql)?;
                
                // Record the migration
                tx.execute(
                    "INSERT INTO migrations (version, description) VALUES (?, ?)",
                    params![version, description]
                )?;
                
                // Commit the transaction
                tx.commit()?;
                
                println!("✅ Migration {} applied successfully", version);
            } else {
                println!("⏭️ Migration {} already applied, skipping", version);
            }
        }
        
        Ok(())
    }
    
    // Archive operations
    pub fn get_all_archives(&self) -> Result<Vec<Archive>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, updated_at FROM archives ORDER BY updated_at DESC"
        )?;
        
        let archives = stmt.query_map([], |row| {
            Ok(Archive {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
        
        Ok(archives)
    }
    
    pub fn get_archive_by_id(&self, id: &str) -> Result<Option<Archive>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, updated_at FROM archives WHERE id = ?"
        )?;
        
        let archive = stmt.query_row(params![id], |row| {
            Ok(Archive {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }).optional()?;
        
        Ok(archive)
    }
    
    pub fn save_archive(&self, archive: &Archive) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO archives (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            params![archive.id, archive.name, archive.description, archive.created_at, archive.updated_at]
        )?;
        Ok(())
    }

    // Tome operations
    pub fn get_tomes_by_archive_id(&self, archive_id: &str) -> Result<Vec<Tome>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, archive_id, name, description, created_at, updated_at FROM tomes WHERE archive_id = ? ORDER BY updated_at DESC"
        )?;
        
        let tomes = stmt.query_map(params![archive_id], |row| {
            Ok(Tome {
                id: row.get(0)?,
                archive_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
        
        Ok(tomes)
    }
    
    pub fn save_tome(&self, tome: &Tome) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO tomes (id, archive_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            params![tome.id, tome.archive_id, tome.name, tome.description, tome.created_at, tome.updated_at]
        )?;
        Ok(())
    }
    
    // Entry operations
    pub fn get_entries_by_tome_id(&self, tome_id: &str) -> Result<Vec<Entry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, tome_id, name, content, entry_type, created_at, updated_at FROM entries WHERE tome_id = ? ORDER BY updated_at DESC"
        )?;
        
        let entries = stmt.query_map(params![tome_id], |row| {
            Ok(Entry {
                id: row.get(0)?,
                tome_id: row.get(1)?,
                name: row.get(2)?,
                content: row.get(3)?,
                entry_type: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;
        
        Ok(entries)
    }
    
    pub fn save_entry(&self, entry: &Entry) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO entries (id, tome_id, name, content, entry_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![entry.id, entry.tome_id, entry.name, entry.content, entry.entry_type, entry.created_at, entry.updated_at]
        )?;
        Ok(())
    }
    
    pub fn delete_entry(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM entries WHERE id = ?",
            params![id]
        )?;
        Ok(())
    }
    
    // Bulk operations for sync
    pub fn bulk_save_archives(&mut self, archives: &[Archive]) -> Result<()> {
        let tx = self.conn.transaction()?;
        
        for archive in archives {
            tx.execute(
                "INSERT OR REPLACE INTO archives (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                params![archive.id, archive.name, archive.description, archive.created_at, archive.updated_at]
            )?;
        }
        
        tx.commit()?;
        Ok(())
    }
    
    pub fn bulk_save_tomes(&mut self, tomes: &[Tome]) -> Result<()> {
        let tx = self.conn.transaction()?;
        
        for tome in tomes {
            tx.execute(
                "INSERT OR REPLACE INTO tomes (id, archive_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                params![tome.id, tome.archive_id, tome.name, tome.description, tome.created_at, tome.updated_at]
            )?;
        }
        
        tx.commit()?;
        Ok(())
    }
    
    pub fn bulk_save_entries(&mut self, entries: &[Entry]) -> Result<()> {
        let tx = self.conn.transaction()?;
        
        for entry in entries {
            tx.execute(
                "INSERT OR REPLACE INTO entries (id, tome_id, name, content, entry_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![entry.id, entry.tome_id, entry.name, entry.content, entry.entry_type, entry.created_at, entry.updated_at]
            )?;
        }
        
        tx.commit()?;
        Ok(())
    }
    
    // Clear all data for sync
    pub fn clear_all_data(&mut self) -> Result<()> {
        let tx = self.conn.transaction()?;
        
        tx.execute("DELETE FROM entries", [])?;
        tx.execute("DELETE FROM tomes", [])?;
        tx.execute("DELETE FROM archives", [])?;
        
        tx.commit()?;
        Ok(())
    }
    
    // AI Clarity Findings operations
    pub fn persist_clarity_findings(&mut self, entry_id: &str, chunks: &[(String, i32, i32)], findings: &[(String, String, String, i32)]) -> Result<()> {
        let tx = self.conn.transaction()?;
        
        // Clear existing findings for this entry
        tx.execute("DELETE FROM requirement_chunk WHERE note_id = ?", [entry_id])?;
        tx.execute("DELETE FROM ambiguity_finding WHERE chunk_id IN (SELECT chunk_id FROM requirement_chunk WHERE note_id = ?)", [entry_id])?;
        
        // Insert chunks
        for (text, start_offset, end_offset) in chunks {
            tx.execute(
                "INSERT OR IGNORE INTO requirement_chunk (note_id, text, start_offset, end_offset) VALUES (?, ?, ?, ?)",
                params![entry_id, text, start_offset.to_string(), end_offset.to_string()]
            )?;
        }
        
        // Insert findings
        for (kind, phrase, suggested_rewrite, severity) in findings {
            tx.execute(
                "INSERT OR IGNORE INTO ambiguity_finding (chunk_id, kind, phrase, suggested_rewrite, clarifying_q, severity) VALUES (?, ?, ?, ?, ?, ?)",
                params![entry_id, kind, phrase, suggested_rewrite, suggested_rewrite, severity.to_string()]
            )?;
        }
        
        tx.commit()?;
        Ok(())
    }
} 