import Database from '@tauri-apps/plugin-sql';
import { join, resourceDir } from '@tauri-apps/api/path';

let dbPromise: ReturnType<typeof Database.load> | null = null;

export const getDb = async () => {
  if (dbPromise) return dbPromise;

  const resDir = await resourceDir();
  const repoRoot = await join(resDir, '..', '..', '..');
  const dbDir = await join(repoRoot, 'src', 'db');
  const dbPath = await join(dbDir, 'stackscribe.db');

  console.log("JS DB URL →", `sqlite:${dbPath}`);

  // Load (or create) the SQLite database using an *absolute* path.
  dbPromise = Database.load(`sqlite:${dbPath}`);
  return dbPromise;
}
