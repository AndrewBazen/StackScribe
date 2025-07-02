use std::process::{Command, Stdio};

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

// --------- main entry point ---------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "Initial migration",
            sql: include_str!("../../src/migrations/001_init.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:stackscribe.db", migrations)
            .build())
        .invoke_handler(tauri::generate_handler![echo, run_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
