use std::{process::{Command, Stdio, Child}, sync::Mutex};


// Global state for managing Python service
static PYTHON_SERVICE: Mutex<Option<Child>> = Mutex::new(None);

// Start AI service containers
#[tauri::command]
pub async fn start_ai_service_internal() -> Result<serde_json::Value, String> {
    // Check if containers are already running (without holding the lock)
    let status_result = check_containers_status().await;
    if let Ok(status) = &status_result {
        if status.get("is_running").and_then(|v| v.as_bool()).unwrap_or(false) {
            return Ok(serde_json::json!({
                "status": "already_running",
                "message": "AI service containers are already running"
            }));
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

// Helper function to check container status
pub async fn check_containers_status() -> Result<serde_json::Value, String> {
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
pub async fn startup_ai_service() -> Result<serde_json::Value, String> {
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

