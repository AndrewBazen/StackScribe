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
    pub name: String,
    pub path: PathBuf,
    pub content: String,
    pub tome_id: String,
}

impl Entry {
    pub fn new(name: String, tome_path: &PathBuf, tome_id: String) -> Self {
        let path = tome_path.join("entries").join(format!("{}.md", name));
        let content = String::from("Write your entry here...");
        Self { name, path, content, tome_id }
    }

    pub fn get_path(&self) -> PathBuf {
        self.path.clone()
    }


    pub fn set_content(&mut self, content: String) {
        std::fs::write(self.get_path(), content).unwrap();
    }


}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tome {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub archive_id: String,
    pub entries: Vec<Entry>,
}

impl Tome {
    pub fn new(name: String, archive: &Archive) -> Self {
        let id = Uuid::new_v4().to_string();
        let path = archive.path.join("tomes").join(name.clone());
        if !path.exists() {
            std::fs::create_dir_all(&path).unwrap();
            std::fs::create_dir_all(&path.join("entries")).unwrap();
        }
        Self { id, name, path, archive_id: archive.id.clone(), entries: Vec::new() }
    }

    pub fn get_entries(&self) -> Vec<Entry> {
        self.entries.clone()
    }

    pub fn get_entry(&self, name: String) -> Entry {
        let entry = self.entries.iter().find(|e| e.name == name).unwrap().clone();
        entry
    }

    pub fn add_entry(&mut self, name: String) {
        let entry = Entry::new(name, &self.path, self.id.clone());
        self.entries.push(entry);
    }

    pub fn remove_entry(&mut self, entry: Entry) {
        self.entries.retain(|e| e.name != entry.name);
    }

    pub fn update_entry(&mut self, mut entry: Entry, content: String) {  
        entry.set_content(content.clone());
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Archive {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub tomes: Vec<Tome>,
}

impl Archive {
    pub async fn new(name: String) -> Self {
        let id = Uuid::new_v4();
        let id = id.to_string();
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
        Self { id, name, path, tomes: Vec::new() }
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

        Ok(Self { id, name, path: path.to_path_buf(), tomes: Vec::new() })
    }

    pub fn get_tomes(&self) -> Vec<Tome> {
        self.tomes.clone()
    }

    pub fn get_tome(&self, id: String) -> Tome {
        let tomes = self.get_tomes();       
        let tome = tomes.iter().find(|t| t.id == id).unwrap().clone();
        tome
    }

    pub fn remove_tome(&mut self, id: String) {
        self.tomes.retain(|t| t.id != id);
    }

}
