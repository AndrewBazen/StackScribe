use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub content: String,
    pub tome_id: String,
    pub dirty: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Archive {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub tomes: Vec<Tome>,
    pub last_selected_tome: Option<Tome>,
}
