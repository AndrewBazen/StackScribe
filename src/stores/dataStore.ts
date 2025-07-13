import { getDb } from "../lib/db";
import { Archive } from "../types/archive";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";
import { QueryResult } from "@tauri-apps/plugin-sql";

// Archives
export const getAllArchives = async (): Promise<Archive[]> => {
    const db = await getDb();
    const rows = await db.select<Archive[]>(
        `SELECT * FROM archives ORDER BY updated_at DESC`
    );
    for (const row of rows) {
        if (typeof row.description !== "string") {
            row.description = "";
        }
    }
    return rows;
};

export const getArchiveById = async (id: string): Promise<Archive | null> => {
    const db = await getDb();
    const rows = await db.select<Archive[]>(
        `SELECT * FROM archives WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
};

export const saveArchive = async (archive: Archive): Promise<void> => {
    const db = await getDb();
    const existing = await getArchiveById(archive.id);

    if (!existing || new Date(existing.updated_at) < new Date(archive.updated_at)) {
        await db.execute(
            `INSERT OR REPLACE INTO archives (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
            [archive.id, archive.name, archive.description || null, archive.created_at, archive.updated_at]
        );
    } else {
        console.warn(`⏩ Skipping archive ${archive.name} - local is newer than remote.`);
    }
};

export const deleteArchive = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.execute(`DELETE FROM archives WHERE id = ?`, [id]);
};

// Tomes
export const getTomesByArchiveId = async (archiveId: string): Promise<Tome[]> => {
    const db = await getDb();
    return await db.select<Tome[]>(
        `SELECT * FROM tomes WHERE archive_id = ? ORDER BY updated_at DESC`,
        [archiveId]
    );
};

export const getTomeById = async (id: string): Promise<Tome | null> => {
    try {
        const db = await getDb();
        const rows = await db.select<Tome[]>(
            `SELECT * FROM tomes WHERE id = ? LIMIT 1`,
            [id]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error("unable to get Tome ", error);
        return null;
    }
    
};

export const saveTome = async (tome: Tome): Promise<void> => {
    const db = await getDb();
    const existing = await getTomeById(tome.id);

    if (!existing || new Date(existing.updated_at) < new Date(tome.updated_at)) {
        await db.execute(
            `INSERT OR REPLACE INTO tomes (id, archive_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [tome.id, tome.archive_id, tome.name, tome.description || null, tome.created_at, tome.updated_at]
        );
    } else {
        console.warn(`⏩ Skipping tome ${tome.name} - local is newer than remote.`);
    }
};

export const deleteTome = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.execute(`DELETE FROM tomes WHERE id = ?`, [id]);
};

// Entries
export const getEntriesByTomeId = async (tomeId: string): Promise<Entry[]> => {
    const db = await getDb();
    return await db.select<Entry[]>(
        `SELECT * FROM entries WHERE tome_id = ? ORDER BY updated_at DESC`,
        [tomeId]
    );
};

export const getEntryById = async (id: string): Promise<Entry | null> => {
    const db = await getDb();
    const rows = await db.select<Entry[]>(
        `SELECT * FROM entries WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows.length > 0 ? rows[0] : null;

};

export const saveEntry = async (entry: Entry): Promise<QueryResult> => {
    const db = await getDb();
    const existing = await getEntryById(entry.id);

    if (!existing || new Date(existing.updated_at) < new Date(entry.updated_at)) {
        return await db.execute(
            `INSERT OR REPLACE INTO entries (id, tome_id, name, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [entry.id, entry.tome_id, entry.name, entry.content, entry.created_at, entry.updated_at]
        );
    } else if (new Date(existing.updated_at) > new Date(entry.updated_at)) {
        console.warn(`⏩ Skipping entry ${entry.name} - remote is newer than local.`);
        return { rowsAffected: 0, lastInsertId: undefined };
    } else {
        console.warn(`⏩ Skipping entry ${entry.name} - local and remote are the same.`);
        return { rowsAffected: 0, lastInsertId: undefined };
    }
};

export const deleteEntry = async (id: string): Promise<void> => {
    try {
        const db = await getDb();
        await db.execute(`DELETE FROM entries WHERE id = ?`, [id]);
    } catch (error) {
        console.error(`Failed to delete Entry, ${error}`);
    }
    
};

/** getSortedAndUpdated - returns an array of objects sorted by last update time
 * 
 * @param current 
 * @param type 
 * @returns Promise<Archive[] | Tome[] | Entry[] | null> 
 */
export const getSortedAndUpdated = async (current: Archive | Tome,
     type: "archive" | "tome" | "entry"): Promise<Archive[] | Tome[] | Entry[] | null> => {
    try {
        const db = await getDb();
        if (type === "archive") {
            return await db.select<Archive[]>(
                    `SELECT * FROM archives ORDER BY updated_at DESC`
            );
        } else if (type === "tome") {
            return await db.select<Tome[]>(
                    `SELECT * FROM tomes WHERE archive_id = ? ORDER BY updated_at DESC`,
                    [current.id]
            );
        } else {
            return await db.select<Entry[]>(
                    `SELECT * FROM entries WHERE tome_id = ? ORDER BY updated_at DESC`,
                    [current.id]
            );
        }
    } catch (error) {
        console.error(`Unable to read updated archives, ${error}`);
        return null;
    } 
}

const LAST_SYNCED_KEY = 'last_synced_at';

/** getLastSyncedAt - returns the timestamp of the last successful sync to the server
 * 
 * @param userId 
 * @returns Promise<string | null>  
 */
export const getLastSyncedAt = async (userId: string): Promise<string | null> => {
    try {
        const db = await getDb();
        const res = await db.select<{ value: string }[]>(
            `SELECT value FROM user_sync_metadata WHERE user_id = ? AND key = ? LIMIT 1`,
            [userId, LAST_SYNCED_KEY]
        );
        return res.length > 0 ? res[0].value : null;
    } catch (error) {
        console.error(`Unable to get last sync time, ${error}`);
        return null;
    }
    
};

/** setLastSyncedAt - sets the timestamp for the latest sync
 * 
 * @param timestamp 
 * @param userId 
 */
export const setLastSyncedAt = async (timestamp: string, userId: string) => {
    try {
        const db = await getDb();
        await db.execute(
            `INSERT OR REPLACE INTO user_sync_metadata (user_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [userId, LAST_SYNCED_KEY, timestamp]
        );
    } catch (error) {
        console.error(`Unable to set last sync time, ${error}`);
    }
};
