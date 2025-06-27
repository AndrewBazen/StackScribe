use serde::{Serialize, Deserialize};
use uuid::Uuid;
use std::path::PathBuf;
use serde_json::json;
use std::fs;


// During development `src-tauri` is the current dir. We store the data one
// directory above it so file creations do not trigger the Rust watcher.
const ARCHIVE_DIR: &str = "../archives";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub content: String,
    pub tome_id: String,
    pub dirty: bool,
}

impl Entry {
    pub fn new(name: String, tome_path: &PathBuf, tome_id: String) -> Self {
        let id = Uuid::new_v4().to_string();
        let path = tome_path.join("entries").join(format!("{}.md", name));
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let content = String::from("Write your entry here...");
        if !path.exists() {
            let _ = std::fs::write(&path, &content);
        }

        Self { id, name, path, content, tome_id, dirty: false }
    }

    pub fn set_content(&self, content: &str) -> Result<(), String> {
        fs::write(&self.path, content).map_err(|e| e.to_string())
    }

    pub fn get_content(&self) -> String {
        std::fs::read_to_string(self.path.clone()).unwrap_or_else(|_| self.content.clone())
    }
    
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tome {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub archive_id: String,
    pub entries: Vec<Entry>,
    pub last_selected_entry: Option<Entry>,
}

impl Tome {
    pub fn new(name: String, archive: &Archive) -> Self {
        let id = Uuid::new_v4().to_string();
        let path = archive.path.join("tomes").join(name.clone());
        if !path.exists() {
            std::fs::create_dir_all(&path).unwrap();
            std::fs::create_dir_all(&path.join("entries")).unwrap();
        }
        let mut tome = Self { id, name, path, archive_id: archive.id.clone(), entries: vec![], last_selected_entry: None };
        tome.load_entries().unwrap();
        tome
    }

    pub fn load_entries(&mut self) -> Result<(), String> {
        let meta_path = self.path.join("entries");
        if !meta_path.exists() {
            return Ok(());
        }
        
        let entries = fs::read_dir(&meta_path)
            .map_err(|e| format!("Failed to read {:?}: {}", meta_path, e))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().extension().map_or(false, |ext| ext == "md"))
            .map(|entry| {
                let path = entry.path();
                let file_stem = path.file_stem().unwrap().to_str().unwrap().to_string();
                Entry::new(file_stem, &self.path, self.id.clone())
            })
            .collect::<Vec<Entry>>();
            
        self.entries = entries;
        self.last_selected_entry = self.entries.first().cloned();
        Ok(())
    }



    pub fn save_entry(&mut self, entry: Entry) -> Result<(), String> {
        let name = entry.name.clone().replace(" ", "_");
        let meta_path = self.path.join("entries").join(format!("{}.md", name));
        if let Err(e) = fs::write(&meta_path, entry.content) {
            eprintln!("Failed to write entry metadata: {e}");
        }
        Ok(())
    }

    pub fn add_entry(&mut self, name: String) -> Result<(), String> {
        let entry = Entry::new(name, &self.path, self.id.clone());
        self.entries.push(entry.clone());
        self.save_entry(entry).unwrap();
        self.load_entries().unwrap();
        self.last_selected_entry = self.entries.first().cloned();
        Ok(())
    }

    pub fn remove_entry(&mut self, entry: Entry) -> Result<(), String> {
        self.entries.retain(|e| e.id != entry.id);
        self.save_entry(entry).unwrap();
        self.load_entries().unwrap();
        self.last_selected_entry = self.entries.first().cloned();
        Ok(())
    }

    pub fn get_entry_by_id(&self, id: String) -> Option<Entry> {
        self.entries.iter().find(|e| e.id == id).cloned()
    }

    pub fn get_last_entry(&self) -> Option<Entry> {
        self.last_selected_entry.clone()
    }

    pub fn set_last_entry(&mut self, entry: Entry) {
        self.last_selected_entry = Some(entry);
    }   

    pub fn get_entries(&self) -> Vec<Entry> {
        self.entries.clone()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Archive {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub tomes: Vec<Tome>,
    pub last_selected_tome: Option<Tome>,
}

impl Archive {
    pub async fn new(name: String) -> Self {
        let id = Uuid::new_v4().to_string();
        let path = PathBuf::from(ARCHIVE_DIR).join(name.clone());
        if !path.exists() {
            std::fs::create_dir_all(&path).unwrap();
            std::fs::create_dir_all(&path.join("tomes")).unwrap();
        }

        // Persist minimal metadata so we can later reconstruct the Archive
        let meta_path = path.join("archive.json");
        let meta = json!({
            "id": id,
            "name": name,
        });
        if let Err(e) = fs::write(&meta_path, meta.to_string()) {
            eprintln!("Failed to write archive metadata: {e}");
        }

        Self { id, name, path, tomes: Vec::new(), last_selected_tome: None }
    }

    /// Load an existing archive from the directory path by reading its metadata file.
    pub fn load<P: AsRef<std::path::Path>>(path: P) -> Result<Self, String> {
        let path = path.as_ref();
        let meta_path = path.join("archive.json");
        let data = fs::read_to_string(&meta_path)
            .map_err(|e| format!("Failed to read {:?}: {}", meta_path, e))?;
        let meta: serde_json::Value = serde_json::from_str(&data)
            .map_err(|e| format!("Failed to parse archive.json: {}", e))?;

        let id = meta.get("id")
            .and_then(|v| v.as_str())
            .ok_or("archive.json missing 'id'")?
            .to_string();
        let name = meta.get("name")
            .and_then(|v| v.as_str())
            .ok_or("archive.json missing 'name'")?
            .to_string();

        let mut archive = Self { id, name, path: path.to_path_buf(), tomes: Vec::new(), last_selected_tome: None };
        archive.load_tomes().unwrap();
        Ok(archive) 
    }

    pub fn setup_archive(&mut self, tome_name: String) {
        let tome = Tome::new(tome_name, &self);
        self.tomes.push(tome.clone());
        self.last_selected_tome = Some(tome);
        self.update_metadata();
    }

    pub fn update_metadata(&mut self) {
        let meta_path = self.path.join("archive.json");
        let meta = json!({
            "id": self.id,
            "name": self.name,
            "tomes": self.tomes.iter().map(|t| t.id.clone()).collect::<Vec<String>>(),
        });
        if let Err(e) = fs::write(&meta_path, meta.to_string()) {
            eprintln!("Failed to write archive metadata: {e}");
        }
    }

    pub fn load_tomes(&mut self) -> Result<(), String> {
        let tomes_path = self.path.join("tomes");
        if !tomes_path.exists() {
            return Ok(());
        }

        let tomes = fs::read_dir(&tomes_path)
            .map_err(|e| format!("Failed to read {:?}: {}", tomes_path, e))?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.path().is_dir())
            .map(|entry| {
                let tome_name = entry.file_name().to_str().unwrap().to_string();
                Tome::new(tome_name, &self)
            })
            .collect::<Vec<Tome>>();
            
        self.tomes = tomes;
        self.last_selected_tome = self.tomes.first().cloned();
        Ok(())
    }



    pub fn remove_tome(&mut self, id: String) -> Result<(), String> {
        self.tomes.retain(|t| t.id != id);
        self.update_metadata();
        Ok(())
    }

    pub fn set_last_tome(&mut self, tome: Tome) {
        self.last_selected_tome = Some(tome);
        self.update_metadata();
    }

    pub fn get_last_tome(&self) -> Option<Tome> {
        self.last_selected_tome.clone()
    }

    pub fn get_tome(&self, tome_id: String) -> Tome {
        self.tomes.iter().find(|t| t.id == tome_id).unwrap().clone()
    }

    pub fn get_tomes(&self) -> Vec<Tome> {
        self.tomes.clone()
    }

    pub fn set_tomes(&mut self, tomes: Vec<Tome>) {
        self.tomes = tomes;
        self.update_metadata();
    }
}
