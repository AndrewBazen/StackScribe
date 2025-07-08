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
        for (const tome of archive.tomes || []) {
            if (tome) await saveTome(tome);
            for (const entry of tome.entries || []) {
                if (entry) await saveEntry(entry);
            }
        }
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
    } else {
        console.warn(`⏩ Skipping entry ${entry.name} - local is newer than remote.`);
        return { rowsAffected: 0, lastInsertId: undefined };
    }
};

export const deleteEntry = async (id: string): Promise<void> => {
    const db = await getDb();
    await db.execute(`DELETE FROM entries WHERE id = ?`, [id]);
};

// Sync-specific queries
export const getUpdatedArchivesSince = async (lastSyncedAt: string | null): Promise<Archive[]> => {
    const db = await getDb();
    return await db.select<Archive[]>(
        lastSyncedAt
            ? `SELECT * FROM archives WHERE updated_at > ? ORDER BY updated_at DESC`
            : `SELECT * FROM archives ORDER BY updated_at DESC`,
        lastSyncedAt ? [lastSyncedAt] : []
    );
};

export const getUpdatedTomesSince = async (lastSyncedAt: string | null): Promise<Tome[]> => {
    const db = await getDb();
    return await db.select<Tome[]>(
        lastSyncedAt
            ? `SELECT * FROM tomes WHERE updated_at > ? ORDER BY updated_at DESC`
            : `SELECT * FROM tomes ORDER BY updated_at DESC`,
        lastSyncedAt ? [lastSyncedAt] : []
    );
};

// Get updated entries since last sync
// This function retrieves entries that have been updated since the last sync time.
export const getUpdatedEntriesSince = async (lastSyncedAt: string | null): Promise<Entry[]> => {
    const db = await getDb();
    return await db.select<Entry[]>(
        lastSyncedAt
            ? `SELECT * FROM entries WHERE updated_at > ? ORDER BY updated_at DESC`
            : `SELECT * FROM entries ORDER BY updated_at DESC`,
        lastSyncedAt ? [lastSyncedAt] : []
    );
};

// Sync metadata
const LAST_SYNCED_KEY = 'last_synced_at';

export const getLastSyncedAt = async (): Promise<string | null> => {
    const db = await getDb();
    const res = await db.select<{ value: string }[]>(
        `SELECT value FROM user_sync_metadata WHERE key = ? LIMIT 1`,
        [LAST_SYNCED_KEY]
    );
    return res.length > 0 ? res[0].value : null;
};

export const setLastSyncedAt = async (timestamp: string) => {
    const db = await getDb();
    await db.execute(
        `INSERT OR REPLACE INTO user_sync_metadata (key, value) VALUES (?, ?)`,
        [LAST_SYNCED_KEY, timestamp]
    );
};
