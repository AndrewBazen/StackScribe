use crate::types::Archive;
use std::path::PathBuf;
use sqlite::{Connection, Result};

// get the path to the database
fn get_db_path() -> PathBuf {
    let path = std::env::app_data_dir().unwrap().join("stackscribe.db");
    path
}

// get the path to the database as a string
fn get_db_path_str() -> String {
    get_db_path().to_str().unwrap().to_string()
}

// get the database connection
fn get_db() -> Result<Connection> {
    // Load (or create) the SQLite database using an *absolute* path.
    let db = sqlite::Database::open(get_db_path_str()).unwrap();
    let conn = db.connect().unwrap();
    Ok(conn)
}

// create an archive
#[tauri::command]
async fn create_archive(archive: Archive) -> Result<Archive, String> {
    let conn = get_db().unwrap();
    let stmt = conn.prepare("INSERT INTO archives (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)").unwrap();
    let result = stmt.execute([archive.name, archive.description, archive.created_at, archive.updated_at]).unwrap();
    Ok(archive)
}

// get all archives
#[tauri::command]
async fn get_all_archives() -> Result<Vec<Archive>, String> {
    let conn = get_db().unwrap();
    let stmt = conn.prepare("SELECT * FROM archives").unwrap();
    let result = stmt.execute().unwrap();
    let mut archives = Vec::new();
    for row in result {
        let archive = Archive {
            id: row.get(0),
            name: row.get(1),
            description: row.get(2),
            created_at: row.get(3),
            updated_at: row.get(4),
        };
        archives.push(archive);
    }
    Ok(archives)
}
