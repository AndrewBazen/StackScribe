use std::{process::{Command, Stdio, Child}, sync::Mutex};
use tauri::Emitter;

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

// Start AI service containers
#[tauri::command]
async fn start_python_service() -> Result<serde_json::Value, String> {
    start_ai_service_internal().await
}

// Internal function to start AI service (used by startup and manual commands)
async fn start_ai_service_internal() -> Result<serde_json::Value, String> {
    // Check if containers are already running (without holding the lock)
    let status_result = check_containers_status().await;
    if let Ok(status) = &status_result {
        if status.get("is_running").and_then(|v| v.as_bool()).unwrap_or(false) {
            // If containers are running but don't support newer endpoints, restart to pick up updates.
            if ai_service_supports_indexing().await {
                return Ok(serde_json::json!({
                    "status": "already_running",
                    "message": "AI service containers are already running"
                }));
            } else {
                println!("🔁 AI service is running but missing /api/index_entries; restarting containers to update...");
            }
        }
    }
    
    // Try to start the AI service using Docker Compose
    let child = Command::new("bash")
        .arg("stackscribe-ai-service/docker-start.sh")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start AI service: {}", e))?;
    
    // Now acquire the lock to store the child process
    {
        let mut service = PYTHON_SERVICE.lock().map_err(|e| e.to_string())?;
        *service = Some(child);
    }
    
    Ok(serde_json::json!({
        "status": "started",
        "message": "AI service containers are starting up..."
    }))
}

// Check if the running AI service exposes the indexing endpoint (used by the desktop app)
async fn ai_service_supports_indexing() -> bool {
    // Use OpenAPI spec so we don't need to hit the endpoint itself (which can be expensive)
    if let Ok(response) = reqwest::get("http://localhost:8000/openapi.json").await {
        if response.status().is_success() {
            if let Ok(body) = response.text().await {
                return body.contains("\"/api/index_entries\"");
            }
        }
    }
    false
}

// Helper function to check container status
async fn check_containers_status() -> Result<serde_json::Value, String> {
    let containers_output = Command::new("docker-compose")
        .arg("-f")
        .arg("stackscribe-ai-service/docker-compose.yml")
        .arg("ps")
        .arg("-q")
        .output()
        .map_err(|e| format!("Failed to check container status: {}", e))?;
    
    let containers_running = !containers_output.stdout.is_empty();
    
    Ok(serde_json::json!({
        "is_running": containers_running
    }))
}

// Startup function to auto-start AI service
#[tauri::command]
async fn startup_ai_service() -> Result<serde_json::Value, String> {
    println!("🚀 Starting AI service on app startup...");
    
    // Check if Docker is available
    let docker_check = Command::new("docker")
        .arg("info")
        .output();
    
    match docker_check {
        Ok(output) if output.status.success() => {
            println!("✅ Docker is available, starting AI service...");
            
            // Start the AI service in the background
            match start_ai_service_internal().await {
                Ok(result) => {
                    println!("🤖 AI service startup initiated");
                    Ok(serde_json::json!({
                        "status": "success",
                        "message": "AI service startup initiated",
                        "auto_started": true,
                        "details": result
                    }))
                },
                Err(e) => {
                    println!("⚠️ Failed to start AI service on startup: {}", e);
                    Ok(serde_json::json!({
                        "status": "error",
                        "message": format!("Failed to auto-start AI service: {}", e),
                        "auto_started": false
                    }))
                }
            }
        },
        _ => {
            println!("⚠️ Docker not available, skipping AI service auto-start");
            Ok(serde_json::json!({
                "status": "skipped",
                "message": "Docker not available, AI service not started",
                "auto_started": false
            }))
        }
    }
}

// Stop AI service using Docker Compose
#[tauri::command]
async fn stop_python_service() -> Result<serde_json::Value, String> {
    let mut service = PYTHON_SERVICE.lock().map_err(|e| e.to_string())?;
    
    // Use docker-compose down to stop services properly
    let output = Command::new("docker-compose")
        .arg("-f")
        .arg("stackscribe-ai-service/docker-compose.yml")
        .arg("down")
        .output()
        .map_err(|e| format!("Failed to execute docker-compose down: {}", e))?;
    
    if output.status.success() {
        // Clear the tracked process since we stopped via docker-compose
        if service.is_some() {
            *service = None;
        }
        
        Ok(serde_json::json!({
            "status": "stopped",
            "message": "AI service containers stopped successfully"
        }))
    } else {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        Ok(serde_json::json!({
            "status": "error",
            "message": format!("Failed to stop containers: {}", error_msg)
        }))
    }
}

// Check AI service status using Docker Compose
#[tauri::command]
async fn python_service_status() -> Result<serde_json::Value, String> {
    // Check if Docker containers are running
    let containers_output = Command::new("docker-compose")
        .arg("-f")
        .arg("stackscribe-ai-service/docker-compose.yml")
        .arg("ps")
        .arg("-q")
        .output()
        .map_err(|e| format!("Failed to check container status: {}", e))?;
    
    let containers_running = !containers_output.stdout.is_empty();
    
    // Check if services are responding via HTTP
    let mut qdrant_healthy = false;
    let mut ai_service_healthy = false;
    
    if containers_running {
        // Check Qdrant health
        if let Ok(response) = reqwest::get("http://localhost:6333/").await {
            qdrant_healthy = response.status().is_success();
        }
        
        // Check AI service health
        if let Ok(response) = reqwest::get("http://localhost:8000/health").await {
            if response.status().is_success() {
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    ai_service_healthy = data.get("status").and_then(|s| s.as_str()) == Some("healthy");
                }
            }
        }
    }
    
    Ok(serde_json::json!({
        "is_running": containers_running,
        "is_healthy": ai_service_healthy && qdrant_healthy,
        "services": {
            "qdrant": {
                "running": containers_running,
                "healthy": qdrant_healthy,
                "endpoint": "http://localhost:6333"
            },
            "ai_service": {
                "running": containers_running,
                "healthy": ai_service_healthy,
                "endpoint": "http://localhost:8000"
            }
        }
    }))
}

// fn get_absolute_path_migration(path: &str) -> PathBuf {
//     // Get the current working directory
//     let cwd = std::env::current_dir()
//         .map(|p| p.to_string_lossy().to_string())
//         .unwrap_or_else(|_| "unknown".to_string());
//     if path.starts_with('/') || path.starts_with('\\') {
//         return PathBuf::from(path);
//     }
//     let absolute_path = std::path::Path::new(&cwd).join(path);
//     return absolute_path;
// }   




// --------- main entry point ---------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    // Embed the migration SQL at compile-time so it’s always available, even on mobile
    // where the external file isn’t packaged inside the APK.
    const INITIAL_SCHEMA_SQL: &str = include_str!("../../data/migrations/001_initial_schema.sql");
    const REQUIREMENT_CLARITY_SQL: &str = include_str!("../../data/migrations/002_add_requirement_clarity.sql");
    println!("📄 Embedded initial schema SQL length: {} bytes", INITIAL_SCHEMA_SQL.len());
    println!("📄 Embedded requirement clarity SQL length: {} bytes", REQUIREMENT_CLARITY_SQL.len());
 
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            sql: INITIAL_SCHEMA_SQL,
            description: "Initial schema",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            sql: REQUIREMENT_CLARITY_SQL,
            description: "Add requirement clarity",
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];
    

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:stackscribe.db", migrations)
            .build())
        .setup(|app| {
            // Auto-start AI service on app startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Give the app a moment to fully initialize
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                
                match startup_ai_service().await {
                    Ok(result) => {
                        println!("AI service startup result: {}", result);
                        
                        // Emit startup status to frontend
                        if let Err(e) = app_handle.emit("ai-service-startup", &result) {
                            println!("Failed to emit startup status: {}", e);
                        }
                    },
                    Err(e) => {
                        println!("AI service startup failed: {}", e);
                        let error_result = serde_json::json!({
                            "status": "error",
                            "message": e,
                            "auto_started": false
                        });
                        
                        if let Err(emit_error) = app_handle.emit("ai-service-startup", &error_result) {
                            println!("Failed to emit startup error: {}", emit_error);
                        }
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![echo, run_code, get_current_dir, start_python_service, stop_python_service, python_service_status, startup_ai_service])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
