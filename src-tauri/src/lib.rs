use dotenvy::dotenv;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::{
    env,
    process::{Command, Stdio},
};
use tauri::Emitter;

// --------- Streaming Chat Types ---------

#[derive(Clone, Serialize, Deserialize, Debug)]
struct ChatMessage {
    id: Option<String>,
    role: String,
    content: String,
    timestamp: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
struct ChatContext {
    #[serde(rename = "currentDocument")]
    current_document: String,
    #[serde(rename = "entryId")]
    entry_id: Option<String>,
    #[serde(rename = "entryName")]
    entry_name: Option<String>,
    #[serde(rename = "tomeId")]
    tome_id: Option<String>,
    #[serde(rename = "archiveId")]
    archive_id: Option<String>,
}

#[derive(Clone, Serialize)]
struct ChatChunkEvent {
    request_id: String,
    delta: String,
}

#[derive(Clone, Serialize)]
struct ChatCompleteEvent {
    request_id: String,
    message: Option<ChatMessage>,
    status: String,
    error: Option<String>,
}

// AI service configuration via environment variables
// Required: Set AI_SERVICE_URL to your server (e.g., "http://192.168.1.197:8000")
fn get_ai_service_url() -> Option<String> {
    env::var("AI_SERVICE_URL").ok()
}

fn get_qdrant_url() -> Option<String> {
    // Check for explicit QDRANT_URL first, otherwise derive from AI_SERVICE_URL
    if let Ok(url) = env::var("QDRANT_URL") {
        return Some(url);
    }
    // Derive from AI service URL (same host, port 6333)
    let ai_url = get_ai_service_url()?;
    if let Some(host) = ai_url.strip_prefix("http://") {
        if let Some(host_part) = host.split(':').next() {
            return Some(format!("http://{}:6333", host_part));
        }
    }
    None
}

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
        .arg("-e")
        .arg(code)
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

// Get the configured AI service URL
#[tauri::command]
async fn get_ai_service_config() -> Result<serde_json::Value, String> {
    let ai_url = get_ai_service_url();
    let qdrant_url = get_qdrant_url();

    Ok(serde_json::json!({
        "ai_service_url": ai_url,
        "qdrant_url": qdrant_url,
        "configured": ai_url.is_some()
    }))
}

// Check AI service health (remote server)
#[tauri::command]
async fn python_service_status() -> Result<serde_json::Value, String> {
    let ai_url = match get_ai_service_url() {
        Some(url) => url,
        None => {
            return Ok(serde_json::json!({
                "is_running": false,
                "is_healthy": false,
                "error": "AI_SERVICE_URL environment variable not set",
                "services": {
                    "qdrant": { "running": false, "healthy": false, "endpoint": null },
                    "ai_service": { "running": false, "healthy": false, "endpoint": null }
                }
            }));
        }
    };

    let qdrant_url = get_qdrant_url().unwrap_or_default();

    // Check if services are responding via HTTP
    let mut qdrant_healthy = false;
    let mut ai_service_healthy = false;

    // Check Qdrant health
    if !qdrant_url.is_empty() {
        if let Ok(response) = reqwest::get(&format!("{}/", qdrant_url)).await {
            qdrant_healthy = response.status().is_success();
        }
    }

    // Check AI service health
    if let Ok(response) = reqwest::get(&format!("{}/health", ai_url)).await {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                ai_service_healthy = data.get("status").and_then(|s| s.as_str()) == Some("healthy");
            }
        }
    }

    Ok(serde_json::json!({
        "is_running": ai_service_healthy,
        "is_healthy": ai_service_healthy && qdrant_healthy,
        "services": {
            "qdrant": {
                "running": qdrant_healthy,
                "healthy": qdrant_healthy,
                "endpoint": qdrant_url
            },
            "ai_service": {
                "running": ai_service_healthy,
                "healthy": ai_service_healthy,
                "endpoint": ai_url
            }
        }
    }))
}

// Startup function - check if remote AI service is available
#[tauri::command]
async fn startup_ai_service() -> Result<serde_json::Value, String> {
    println!("🚀 Checking AI service connection on app startup...");

    let ai_url = match get_ai_service_url() {
        Some(url) => url,
        None => {
            println!("⚠️ AI_SERVICE_URL not configured");
            return Ok(serde_json::json!({
                "status": "not_configured",
                "message": "AI_SERVICE_URL environment variable not set. Set it to your AI server address (e.g., http://192.168.1.197:8000)",
                "connected": false
            }));
        }
    };

    println!("🔗 Connecting to AI service at: {}", ai_url);

    // Check if the remote AI service is reachable
    match reqwest::get(&format!("{}/health", ai_url)).await {
        Ok(response) if response.status().is_success() => {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                if data.get("status").and_then(|s| s.as_str()) == Some("healthy") {
                    println!("✅ AI service is healthy at {}", ai_url);
                    return Ok(serde_json::json!({
                        "status": "connected",
                        "message": format!("Connected to AI service at {}", ai_url),
                        "connected": true,
                        "endpoint": ai_url
                    }));
                }
            }
            println!("⚠️ AI service responded but reported unhealthy");
            Ok(serde_json::json!({
                "status": "unhealthy",
                "message": format!("AI service at {} is not healthy", ai_url),
                "connected": false,
                "endpoint": ai_url
            }))
        }
        Ok(response) => {
            println!("⚠️ AI service returned error: {}", response.status());
            Ok(serde_json::json!({
                "status": "error",
                "message": format!("AI service at {} returned status {}", ai_url, response.status()),
                "connected": false,
                "endpoint": ai_url
            }))
        }
        Err(e) => {
            println!("❌ Cannot reach AI service at {}: {}", ai_url, e);
            Ok(serde_json::json!({
                "status": "unreachable",
                "message": format!("Cannot connect to AI service at {}: {}", ai_url, e),
                "connected": false,
                "endpoint": ai_url
            }))
        }
    }
}

// Start streaming chat - returns request_id immediately, emits events as tokens arrive
#[tauri::command]
async fn start_chat_stream(
    app: tauri::AppHandle,
    request_id: Option<String>, // Accept request ID from frontend to avoid race condition
    messages: Vec<ChatMessage>,
    context: ChatContext,
    model: Option<String>, // Optional model override (e.g., "llama3.2:3b", "gemma2:2b")
) -> Result<String, String> {
    let ai_url = get_ai_service_url().ok_or("AI_SERVICE_URL not configured")?;

    // Use frontend-provided ID or generate one
    let request_id = request_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let request_id_clone = request_id.clone();

    println!("🚀 Starting chat stream with request_id: {}", request_id);
    if let Some(ref m) = model {
        println!("🤖 Using model: {}", m);
    }

    // Spawn async task for streaming
    tauri::async_runtime::spawn(async move {
        let result =
            stream_chat_internal(&app, &ai_url, &request_id_clone, messages, context, model).await;

        if let Err(e) = result {
            println!("❌ Stream error: {}", e);
            let _ = app.emit(
                "chat-complete",
                ChatCompleteEvent {
                    request_id: request_id_clone,
                    message: None,
                    status: "error".to_string(),
                    error: Some(e),
                },
            );
        }
    });

    Ok(request_id)
}

async fn stream_chat_internal(
    app: &tauri::AppHandle,
    ai_url: &str,
    request_id: &str,
    messages: Vec<ChatMessage>,
    context: ChatContext,
    model: Option<String>,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    let mut payload = serde_json::json!({
        "messages": messages,
        "context": context,
        "stream": true
    });

    // Add model to payload if specified
    if let Some(model_name) = model {
        payload
            .as_object_mut()
            .unwrap()
            .insert("model".to_string(), serde_json::json!(model_name));
    }

    println!("📤 Sending request to {}/api/chat/stream", ai_url);

    let response = client
        .post(format!("{}/api/chat/stream", ai_url))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut full_content = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        println!(
            "📥 Raw chunk received ({} bytes): {:?}",
            chunk.len(),
            chunk_str
        );
        buffer.push_str(&chunk_str);
        println!(
            "📦 Buffer now ({} bytes): {:?}",
            buffer.len(),
            &buffer[..buffer.len().min(200)]
        );

        // Process complete SSE lines (data: {...}\n\n or data: {...}\n)
        // Determine if we have double newline or single newline
        while let Some((line_end, skip_len)) = buffer.find("\n\n").map(|p| (p, 2)).or_else(|| {
            // Fallback: try single newline if we have a complete data line
            if let Some(pos) = buffer.find('\n') {
                let line = &buffer[..pos];
                if line.starts_with("data: ") && line.contains('}') {
                    return Some((pos, 1));
                }
            }
            None
        }) {
            let line = buffer[..line_end].to_string();
            buffer = buffer[line_end + skip_len..].to_string();
            println!("📝 Processing line: {:?}", &line[..line.len().min(100)]);

            // Skip empty lines
            if line.trim().is_empty() {
                continue;
            }

            if line.starts_with("data: ") {
                let data_str = &line[6..];

                if let Ok(data) = serde_json::from_str::<serde_json::Value>(data_str) {
                    // Handle delta chunks
                    if let Some(delta) = data.get("delta").and_then(|d| d.as_str()) {
                        full_content.push_str(delta);
                        let _ = app.emit(
                            "chat-chunk",
                            ChatChunkEvent {
                                request_id: request_id.to_string(),
                                delta: delta.to_string(),
                            },
                        );
                    }

                    // Handle completion
                    if data.get("done").and_then(|d| d.as_bool()) == Some(true) {
                        let status = data
                            .get("status")
                            .and_then(|s| s.as_str())
                            .unwrap_or("success")
                            .to_string();

                        let error = data
                            .get("error")
                            .and_then(|e| e.as_str())
                            .map(|s| s.to_string());

                        let message = if status == "success" {
                            Some(ChatMessage {
                                id: data
                                    .get("message")
                                    .and_then(|m| m.get("id"))
                                    .and_then(|i| i.as_str())
                                    .map(|s| s.to_string()),
                                role: "assistant".to_string(),
                                content: full_content.clone(),
                                timestamp: Some(chrono::Utc::now().to_rfc3339()),
                            })
                        } else {
                            None
                        };

                        println!("✅ Chat stream complete, status: {}", status);
                        let _ = app.emit(
                            "chat-complete",
                            ChatCompleteEvent {
                                request_id: request_id.to_string(),
                                message,
                                status,
                                error,
                            },
                        );
                        return Ok(());
                    }
                }
            }
        }
    }

    // If we exit the loop without a done message, emit completion with what we have
    println!("⚠️ Stream ended without explicit done message");
    let _ = app.emit(
        "chat-complete",
        ChatCompleteEvent {
            request_id: request_id.to_string(),
            message: Some(ChatMessage {
                id: Some(uuid::Uuid::new_v4().to_string()),
                role: "assistant".to_string(),
                content: full_content,
                timestamp: Some(chrono::Utc::now().to_rfc3339()),
            }),
            status: "success".to_string(),
            error: None,
        },
    );

    Ok(())
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
    // Load .env file if present
    dotenv().ok();

    // Embed the migration SQL at compile-time so it's always available, even on mobile
    // where the external file isn’t packaged inside the APK.
    const INITIAL_SCHEMA_SQL: &str = include_str!("../../data/migrations/001_initial_schema.sql");
    const REQUIREMENT_CLARITY_SQL: &str =
        include_str!("../../data/migrations/002_add_requirement_clarity.sql");
    println!(
        "📄 Embedded initial schema SQL length: {} bytes",
        INITIAL_SCHEMA_SQL.len()
    );
    println!(
        "📄 Embedded requirement clarity SQL length: {} bytes",
        REQUIREMENT_CLARITY_SQL.len()
    );

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
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:stackscribe.db", migrations)
                .build(),
        )
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
                    }
                    Err(e) => {
                        println!("AI service startup failed: {}", e);
                        let error_result = serde_json::json!({
                            "status": "error",
                            "message": e,
                            "auto_started": false
                        });

                        if let Err(emit_error) =
                            app_handle.emit("ai-service-startup", &error_result)
                        {
                            println!("Failed to emit startup error: {}", emit_error);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            echo,
            run_code,
            get_current_dir,
            get_ai_service_config,
            python_service_status,
            startup_ai_service,
            start_chat_stream
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
