import { getDb } from './db';
import { readTextFile, readDir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export const runMigrations = async () => {

    const db = await getDb();
    const migrationsDir = await join('..', 'migrations');
    const migrationFiles = await readDir(migrationsDir);

    for (const file of migrationFiles) {
        if (file.name && file.name.endsWith('.sql')) {
            const filePath = await join(migrationsDir, file.name);
            const sql = await readTextFile(filePath);
            try {
                await db.execute(sql);
                console.log(`✅ Migration ${file.name} applied successfully.`);
            } catch (error) {
                console.error(`❌ Error applying migration ${file.name}:`, error);
            }
        }
    }
};
