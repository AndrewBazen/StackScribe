import Database from '@tauri-apps/plugin-sql';

let dbPromise: ReturnType<typeof Database.load> | null = null;

/**
 * Retrieves the SQLite database instance.
 * If the database is already loaded, it returns the existing instance.
 * Otherwise, it loads the database from the specified path.
 *
 * @returns {Promise<Database>} The SQLite database instance.
 */ 
export const getDb = async () => {
  if (dbPromise) return dbPromise;
  // Load (or create) the SQLite database using an *absolute* path.
  dbPromise = Database.load(`sqlite:stackscribe.db`);
  return dbPromise;
}
