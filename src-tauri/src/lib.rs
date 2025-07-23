use std::{process::{Command, Stdio}};
use tauri::{Manager, Emitter};

mod database;
mod commands;
mod ai_commands;

use ai_commands::{startup_ai_service, start_ai_service_internal};

// import commands for database
use commands::{DbState, init_database, get_all_archives, get_archive_by_id, save_archive, 
               get_tomes_by_archive_id, save_tome, get_entries_by_tome_id, save_entry,
               bulk_save_archives, bulk_save_tomes, bulk_save_entries, clear_all_data,
               create_archive, create_tome, create_entry, test_database, delete_entry,
               persist_clarity_findings};


// --------- app commands ---------
// test round trip
#[tauri::command]
async fn echo(input: String) -> String {
    input.chars().rev().collect() //test round trip
}

// exit app command
#[tauri::command]
async fn exit_app() -> Result<(), String> {
    std::process::exit(0);
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




// --------- main entry point ---------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    println!("🚀 Starting StackScribe with Rust database backend...");
    

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .manage(DbState::default())
        .setup(|app| {
            // Initialize database on app startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Initialize the database first
                match init_database(app_handle.state::<DbState>(), app_handle.clone()).await {
                    Ok(_) => {
                        println!("✅ Database initialized successfully");
                    },
                    Err(e) => {
                        println!("❌ Database initialization failed: {}", e);
                    }
                }
                
                // Give the app a moment to fully initialize
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                
                // Auto-start AI service on app startup
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
        // invoke handler
        .invoke_handler(tauri::generate_handler![
            // app commands
            echo,
            exit_app,
            run_code,
            get_current_dir,
            // AI service commands
            startup_ai_service,
            start_ai_service_internal,
            // Database commands
            init_database,
            test_database,
            get_all_archives,
            get_archive_by_id,
            save_archive,
            get_tomes_by_archive_id,
            save_tome,
            get_entries_by_tome_id,
            save_entry,
            delete_entry,
            persist_clarity_findings,
            bulk_save_archives,
            bulk_save_tomes,
            bulk_save_entries,
            clear_all_data,
            create_archive,
            create_tome,
            create_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
