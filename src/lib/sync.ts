import { 
    saveArchive,
    getLastSyncedAt,
    setLastSyncedAt,
    getUpdatedArchivesSince,
    saveTome,
    getUpdatedTomesSince,
    saveEntry,
    getUpdatedEntriesSince,
    getAllArchives
} from "../stores/dataStore";
import { Archive } from "../types/archive";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";

// TODO: update for Azure or other sync service
const API_Base = 'http://192.168.0.69/api/v1';

export interface SyncResponse {
    archives: Archive[];
    tomes: Tome[];
    entries: Entry[];
    lastModified: string;
}

export const syncFromServer = async (): Promise<void> => {
    try {
        const lastSyncedAt = await getLastSyncedAt();
        const url = lastSyncedAt 
            ? `${API_Base}/sync?since=${encodeURIComponent(lastSyncedAt)}`
            : `${API_Base}/sync`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch from server: ${response.statusText}`);
        }

        const serverData: SyncResponse = await response.json();
        
        // Sync archives
        for (const archive of serverData.archives) {
            await saveArchive(archive);
        }
        
        // Sync tomes
        for (const tome of serverData.tomes) {
            await saveTome(tome);
        }
        
        // Sync entries
        for (const entry of serverData.entries) {
            await saveEntry(entry);
        }

        // Update last synced timestamp
        if (serverData.lastModified) {
            await setLastSyncedAt(serverData.lastModified);
        }

        console.log('✅ Successfully synced data from server');
    } catch (error) {
        console.error('❌ Error syncing from server:', error);
        throw error;
    }
};

export const syncToServer = async (): Promise<void> => {
    try {
        const lastSyncedAt = await getLastSyncedAt();
        
        // Get all updated data since last sync
        const updatedArchives = await getUpdatedArchivesSince(lastSyncedAt);
        const updatedTomes = await getUpdatedTomesSince(lastSyncedAt);
        const updatedEntries = await getUpdatedEntriesSince(lastSyncedAt);

        if (updatedArchives.length === 0 && updatedTomes.length === 0 && updatedEntries.length === 0) {
            console.log('📄 No local changes to sync');
            return;
        }

        const payload = {
            archives: updatedArchives,
            tomes: updatedTomes,
            entries: updatedEntries
        };

        const response = await fetch(`${API_Base}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync to server: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.lastModified) {
            await setLastSyncedAt(result.lastModified);
        }

        console.log('✅ Successfully synced data to server');
    } catch (error) {
        console.error('❌ Error syncing to server:', error);
        throw error;
    }
};

export const fullSync = async (): Promise<void> => {
    console.log('🔄 Starting full sync...');
    
    try {
        // First sync from server to get latest data
        await syncFromServer();
        
        // Then sync local changes to server
        await syncToServer();
        
        console.log('✅ Full sync completed successfully');
    } catch (error) {
        console.error('❌ Full sync failed:', error);
        throw error;
    }
};

// Legacy functions for backwards compatibility
export const syncArchives = async (remoteArchives: Archive[]) => {
    const localArchives = await getAllArchives();
    const localMap = new Map(localArchives.map(a => [a.id, a]));

    let newestTimestamp = await getLastSyncedAt();

    for (const remote of remoteArchives) {
        const local = localMap.get(remote.id);
        if (!local || new Date(local.updated_at) < new Date(remote.updated_at)) {
            console.log(`📥 Syncing archive: ${remote.name}`);
            await saveArchive(remote);
            if (!newestTimestamp || new Date(remote.updated_at) > new Date(newestTimestamp)) {
                newestTimestamp = remote.updated_at;
            }
        } else {
            console.warn(`⏩ Skipping archive ${remote.name} - local is newer than remote.`);
        }
    }

    if (newestTimestamp) {
        await setLastSyncedAt(newestTimestamp);
    }

    console.log('✅ Synced all remote archives to local storage.');
};

export const uploadArchives = async () => {
    const updatedLocalArchives = await getAllArchives(); // You might want to filter by lastSyncedAt

    if (updatedLocalArchives.length > 0) {
        console.log(`📤 Uploading ${updatedLocalArchives.length} updated archives...`);

        try {
            const response = await fetch(`${API_Base}/archives`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedLocalArchives)
            });

            if (!response.ok) {
                throw new Error(`Failed to upload archives: ${response.statusText}`);
            }
        }
        catch (err) {
            console.error('❌ Error uploading archives:', err);
            return;
        }
        console.log(`✅ Successfully uploaded ${updatedLocalArchives.length} archives.`);
    }

    return updatedLocalArchives;
};