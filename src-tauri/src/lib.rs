use std::{path::PathBuf, process::{Command, Stdio}};
mod types;

use types::{Archive, Tome, Entry};

#[tauri::command]
async fn get_app_path() -> Result<String, String> {
    // Use the project root (parent of `src-tauri`) as the base so that
    // the `archives/` directory sits outside `src-tauri`.
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let project_root = cwd
        .parent() // `src-tauri` -> project root
        .map(|p| p.to_path_buf())
        .unwrap_or(cwd);

    let dir = project_root.join("archives");
    if !dir.exists() {
        println!("creating archive directory");
        std::fs::create_dir_all(&dir).unwrap();
    } else {
        println!("loading archive directory");
    }
    let path = dir.to_string_lossy().to_string();
    println!("path: {}", path);
    Ok(path)
}

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

// --------- archive commands ---------
// create the archive using the db and return the archive
#[tauri::command]
async fn create_archive( archive_name: String) -> Result<Archive, String> {
    let archive = Archive::new(archive_name.clone()).await;
    Ok(archive)
}

#[tauri::command]
async fn create_tome(mut archive: Archive, tome_name: String) -> Result<Tome, String> {
    let tome = Tome::new(tome_name.clone(), &archive);
    archive.tomes.push(tome.clone());
    Ok(tome)
}

#[tauri::command]
async fn get_archives() -> Result<Vec<Archive>, String> {
    let base = PathBuf::from(get_app_path().await?);
    // Iterate over the directories that already exist under `archives/` and
    // map them to `Archive` instances WITHOUT creating extra folders.
    // We do **not** call `Archive::new` here because that constructor is
    // intended for creating brand-new archives and always generates a fresh
    // UUID (leading to duplicates). Instead, we build the struct manually
    // using the directory name as both the `id` and, for now, the `name`.

    let archives = std::fs::read_dir(&base)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_dir())
        .filter_map(|entry| {
            // Attempt to load metadata; skip directories without valid archive.json
            match Archive::load(entry.path()) {
                Ok(a) => Some(a),
                Err(err) => {
                    eprintln!("Skipping archive {:?}: {}", entry.path(), err);
                    None
                }
            }
        })
        .collect::<Vec<Archive>>();

    Ok(archives)
}

#[tauri::command]
async fn get_tomes(archive: Archive) -> Result<Vec<Tome>, String> {
    let tomes = archive.get_tomes();
    Ok(tomes)
}

#[tauri::command]
async fn create_entry(entry_name: String, mut tome: Tome) -> Result<Entry, String> {
    tome.add_entry(entry_name.clone());
    Ok(tome.get_entry(entry_name.clone()))
}

#[tauri::command]
async fn get_entries(tome: Tome) -> Result<Vec<Entry>, String> {
    let entries = tome.get_entries();
    Ok(entries)
}

#[tauri::command]
async fn update_entry(mut tome: Tome, entry: Entry, content: String) -> Result<Entry, String> {
    tome.update_entry(entry.clone(), content.clone());
    Ok(tome.get_entry(entry.name.clone()))
}

#[tauri::command]
async fn delete_entry(entry: Entry, mut tome: Tome) -> Result<(), String> {
    tome.remove_entry(entry);
    Ok(())
}

#[tauri::command]
async fn get_archive(archive_id: String) -> Result<Archive, String> {
    let archives = get_archives().await?;
    let archive = archives.iter().find(|a| a.id == archive_id).unwrap().clone();
    Ok(archive)
}

#[tauri::command]
async fn get_tome(tome_id: String, archive_id: String) -> Result<Tome, String> {
    let archive = get_archive(archive_id.clone()).await?;
    let tome = archive.get_tome(tome_id.clone());
    Ok(tome)
}

#[tauri::command]
async fn get_entry(entry_name: String, tome: Tome) -> Result<Entry, String> {
    let entry = tome.get_entry(entry_name.clone());
    Ok(entry)
}

#[tauri::command]
async fn delete_tome(mut archive: Archive, tome_id: String) -> Result<(), String> {
    archive.remove_tome(tome_id.clone());
    Ok(())
}

#[tauri::command]
async fn delete_archive(mut archives: Vec<Archive>, archive_id: String) -> Result<(), String> {
    archives.retain(|a| a.id != archive_id);
    Ok(())
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![get_app_path, echo, run_code, create_archive, create_tome, create_entry,
             get_archives, get_tomes, get_entries, update_entry, delete_entry,
             get_archive, get_tome, get_entry, delete_tome, delete_archive])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
