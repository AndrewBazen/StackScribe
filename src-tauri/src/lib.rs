use std::{path::{PathBuf}, process::{Command, Stdio}};

// --------- app commands ---------
// test round trip
#[tauri::command]
async fn echo(input: String) -> String {
    input.chars().rev().collect() //test round trip
}

// run code inline in the editor
#[tauri::command]
async fn run_code(code: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("-e").arg(code)
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// get current working directory
#[tauri::command]
async fn get_current_dir() -> Result<String, String> {
    let current_dir = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();
    Ok(current_dir)
}

fn get_absolute_path_migration(path: &str) -> PathBuf {
    // Get the current working directory
    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    if path.starts_with('/') || path.starts_with('\\') {
        return PathBuf::from(path);
    }
    let absolute_path = std::path::Path::new(&cwd).join(path);
    return absolute_path;
}   




// --------- main entry point ---------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    let migration_pathbuf = get_absolute_path_migration("../data/migrations/001_initial_schema.sql");
    let migration_sql = std::fs::read_to_string(&migration_pathbuf)
        .expect("Failed to read migration file");
    let migration_sql_static: &'static str = Box::leak(migration_sql.into_boxed_str());
    println!("🔧 Migration SQL path: {}", migration_pathbuf.display());
    println!("📄 Migration SQL content length: {} bytes", migration_sql_static.len());   

    let migrations = vec![tauri_plugin_sql::Migration {
        version: 1,
        sql: migration_sql_static, // Use to_string_lossy() to convert PathBuf to String
        description: "Initial migration",
        kind: tauri_plugin_sql::MigrationKind::Up,
    }];
    

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:stackscribe.db", migrations)
            .build())
        .invoke_handler(tauri::generate_handler![echo, run_code, get_current_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
