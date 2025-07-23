import { invoke } from "@tauri-apps/api/core";
import { Archive } from "../types/archive";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";

// Initialize the Rust database
export const initDatabase = async (): Promise<void> => {
  await invoke("init_database");
};

// Test the database functionality
export const testDatabase = async (): Promise<string> => {
  return await invoke("test_database");
};

// Archive operations
export const getAllArchives = async (): Promise<Archive[]> => {
  return await invoke("get_all_archives");
};

export const getArchiveById = async (id: string): Promise<Archive | null> => {
  return await invoke("get_archive_by_id", { id });
};

export const saveArchive = async (archive: Archive): Promise<void> => {
  await invoke("save_archive", { archive });
};

export const createArchive = async (name: string, description?: string): Promise<Archive> => {
  return await invoke("create_archive", { name, description });
};

// Tome operations
export const getTomesByArchiveId = async (archiveId: string): Promise<Tome[]> => {
  return await invoke("get_tomes_by_archive_id", { archiveId });
};

export const saveTome = async (tome: Tome): Promise<void> => {
  await invoke("save_tome", { tome });
};

export const createTome = async (archiveId: string, name: string, description?: string): Promise<Tome> => {
  return await invoke("create_tome", { archiveId, name, description });
};

// Entry operations
export const getEntriesByTomeId = async (tomeId: string): Promise<Entry[]> => {
  return await invoke("get_entries_by_tome_id", { tomeId });
};

export const saveEntry = async (entry: Entry): Promise<void> => {
  await invoke("save_entry", { entry });
};

export const createEntry = async (tomeId: string, name: string, content: string, entryType: string): Promise<Entry> => {
  return await invoke("create_entry", { tomeId, name, content, entryType });
};

// Sync operations
export const bulkSaveArchives = async (archives: Archive[]): Promise<void> => {
  await invoke("bulk_save_archives", { archives });
};

export const bulkSaveTomes = async (tomes: Tome[]): Promise<void> => {
  await invoke("bulk_save_tomes", { tomes });
};

export const bulkSaveEntries = async (entries: Entry[]): Promise<void> => {
  await invoke("bulk_save_entries", { entries });
};

export const clearAllData = async (): Promise<void> => {
  await invoke("clear_all_data");
};

// Delete operations
export const deleteEntry = async (id: string): Promise<void> => {
  await invoke("delete_entry", { id });
};

// AI Clarity Findings operations
export const persistClarityFindings = async (
  entryId: string, 
  chunks: Array<{text: string, start_offset: number, end_offset: number}>, 
  findings: Array<{kind: string, suggestedRewrite: string, severity: number}>
): Promise<void> => {
  const chunksData = chunks.map(c => [c.text, c.start_offset, c.end_offset]);
  const findingsData = findings.map(f => [f.kind, f.suggestedRewrite, f.suggestedRewrite, f.severity]);
  
  await invoke("persist_clarity_findings", { 
    entryId, 
    chunks: chunksData, 
    findings: findingsData 
  });
}; 