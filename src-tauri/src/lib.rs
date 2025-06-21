use std::process::{Command, Stdio};

#[tauri::command]
async fn echo(input: String) -> String {
    input.chars().rev().collect() //test round trip
}

#[tauri::command]
async fn run_code(code: String) -> Result<String, String> {
    let output = Command::new("node")
        .arg("-e").arg(code)
        .stdout(Stdio::piped())
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![echo, run_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
