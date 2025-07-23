use crate::database::{Database, Archive, Tome, Entry};

use std::sync::Mutex;
use tauri::{Manager, State};

pub struct DbState(Mutex<Option<Database>>);

impl Default for DbState {
    fn default() -> Self {
        DbState(Mutex::new(None))
    }
}


#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().unwrap();
    let db_path = app_data_dir.join("stackscribe.db");
    let db_path_str = db_path.to_str().unwrap();
    Ok(db_path_str.to_string())
}

// initialize the database if it doesn't exist
#[tauri::command]
pub async fn init_database(db_state: State<'_, DbState>, app: tauri::AppHandle) -> Result<(), String> {
    let db_path = get_app_data_dir(app).map_err(|e| e.to_string())?;
    println!("DB_PATH: {}", db_path);
    let db = Database::new(&db_path).map_err(|e| e.to_string())?;
    *db_state.0.lock().unwrap() = Some(db);
    Ok(())
}

// get all archives
#[tauri::command]
pub async fn get_all_archives(db_state: State<'_, DbState>) -> Result<Vec<Archive>, String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.get_all_archives().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_archive_by_id(id: String, db_state: State<'_, DbState>) -> Result<Option<Archive>, String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.get_archive_by_id(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_archive(archive: Archive, db_state: State<'_, DbState>) -> Result<(), String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.save_archive(&archive).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_tomes_by_archive_id(archive_id: String, db_state: State<'_, DbState>) -> Result<Vec<Tome>, String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.get_tomes_by_archive_id(&archive_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_tome(tome: Tome, db_state: State<'_, DbState>) -> Result<(), String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.save_tome(&tome).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_entries_by_tome_id(tome_id: String, db_state: State<'_, DbState>) -> Result<Vec<Entry>, String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.get_entries_by_tome_id(&tome_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_entry(entry: Entry, db_state: State<'_, DbState>) -> Result<(), String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.save_entry(&entry).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn bulk_save_archives(archives: Vec<Archive>, db_state: State<'_, DbState>) -> Result<(), String> {
    let mut db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_mut()
        .ok_or("Database not initialized")?;

    db.bulk_save_archives(&archives).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn bulk_save_tomes(tomes: Vec<Tome>, db_state: State<'_, DbState>) -> Result<(), String> {
    let mut db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_mut()
        .ok_or("Database not initialized")?;

    db.bulk_save_tomes(&tomes).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn bulk_save_entries(entries: Vec<Entry>, db_state: State<'_, DbState>) -> Result<(), String> {
    let mut db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_mut()
        .ok_or("Database not initialized")?;

    db.bulk_save_entries(&entries).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_all_data(db_state: State<'_, DbState>) -> Result<(), String> {
    let mut db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_mut()
        .ok_or("Database not initialized")?;

    db.clear_all_data().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_database(db_state: State<'_, DbState>) -> Result<String, String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    // Create a test archive
    let test_archive = Archive {
        id: "test-archive-1".to_string(),
        name: "Test Archive".to_string(),
        description: Some("A test archive for database testing".to_string()),
        created_at: "2024-01-01T00:00:00Z".to_string(), 
        updated_at: "2024-01-01T00:00:00Z".to_string(),
    };

    db.save_archive(&test_archive).map_err(|e| e.to_string())?;
    
    // Retrieve and verify
    let retrieved = db.get_archive_by_id("test-archive-1").map_err(|e| e.to_string())?;
    
    match retrieved {
        Some(archive) => {
            if archive.name == "Test Archive" {
                Ok(("connected".to_string()))
            } else {
                Err("disconnected".to_string())
            }
        },
        None => Err("disconnected".to_string()),
    }

}

#[tauri::command]
pub async fn create_archive(name: String, description: Option<String>, db_state: State<'_, DbState>) -> Result<Archive, String> {
    use uuid::Uuid;
    use chrono::Utc;
    
    let archive = Archive {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
    };

    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.save_archive(&archive).map_err(|e| e.to_string())?;
    Ok(archive)
}

#[tauri::command]
pub async fn create_tome(archive_id: String, name: String, description: Option<String>, db_state: State<'_, DbState>) -> Result<Tome, String> {
    use uuid::Uuid;
    use chrono::Utc;
    
    let tome = Tome {
        id: Uuid::new_v4().to_string(),
        archive_id,
        name,
        description,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
    };

    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.save_tome(&tome).map_err(|e| e.to_string())?;
    Ok(tome)
}

#[tauri::command]
pub async fn create_entry(tome_id: String, name: String, content: String, entry_type: String, db_state: State<'_, DbState>) -> Result<Entry, String> {
    use uuid::Uuid;
    use chrono::Utc;
    
    let entry = Entry {
        id: Uuid::new_v4().to_string(),
        tome_id,
        name,
        content,
        entry_type,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
    };

    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.save_entry(&entry).map_err(|e| e.to_string())?;
    Ok(entry)
}

#[tauri::command]
pub async fn delete_entry(id: String, db_state: State<'_, DbState>) -> Result<(), String> {
    let db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_ref()
        .ok_or("Database not initialized")?;

    db.delete_entry(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn persist_clarity_findings(
    entry_id: String, 
    chunks: Vec<(String, i32, i32)>, 
    findings: Vec<(String, String, String, i32)>,
    db_state: State<'_, DbState>
) -> Result<(), String> {
    let mut db_guard = db_state.0.lock().unwrap();
    let db = db_guard.as_mut()
        .ok_or("Database not initialized")?;

    db.persist_clarity_findings(&entry_id, &chunks, &findings).map_err(|e| e.to_string())
} 