use std::{path::{PathBuf}, process::{Command, Stdio, Child}, sync::Mutex};

// AI service now handled via Python HTTP API

// Global state for managing Python service
static PYTHON_SERVICE: Mutex<Option<Child>> = Mutex::new(None);

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

// AI services are now handled via Python HTTP API
// Use start_python_service, stop_python_service, and python_service_status instead

// Start Python AI service
#[tauri::command]
async fn start_python_service() -> Result<serde_json::Value, String> {
    let mut service = PYTHON_SERVICE.lock().map_err(|e| e.to_string())?;
    
    if service.is_some() {
        return Ok(serde_json::json!({
            "status": "already_running",
            "message": "Python service is already running"
        }));
    }
    
    // Try to start the Python service using the startup script
    let child = Command::new("bash")
        .arg("stackscribe-ai-service/start.sh")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Python service: {}", e))?;
    
    *service = Some(child);
    
    Ok(serde_json::json!({
        "status": "started",
        "message": "Python AI service started successfully"
    }))
}

// Stop Python AI service
#[tauri::command]
async fn stop_python_service() -> Result<serde_json::Value, String> {
    let mut service = PYTHON_SERVICE.lock().map_err(|e| e.to_string())?;
    
    if let Some(mut child) = service.take() {
        child.kill().map_err(|e| format!("Failed to stop Python service: {}", e))?;
        
        Ok(serde_json::json!({
            "status": "stopped",
            "message": "Python AI service stopped successfully"
        }))
    } else {
        Ok(serde_json::json!({
            "status": "not_running",
            "message": "Python service is not running"
        }))
    }
}

// Check Python AI service status
#[tauri::command]
async fn python_service_status() -> Result<serde_json::Value, String> {
    let is_running = {
        let service = PYTHON_SERVICE.lock().map_err(|e| e.to_string())?;
        service.is_some()
    };
    
    // Also check if service is responding via HTTP
    let mut is_healthy = false;
    if is_running {
        if let Ok(response) = reqwest::get("http://localhost:8000/health").await {
            if response.status().is_success() {
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    is_healthy = data.get("status").and_then(|s| s.as_str()) == Some("healthy");
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "is_running": is_running,
        "is_healthy": is_healthy,
        "endpoint": "http://localhost:8000"
    }))
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
        .invoke_handler(tauri::generate_handler![echo, run_code, get_current_dir, start_python_service, stop_python_service, python_service_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
