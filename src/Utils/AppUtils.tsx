import { invoke } from "@tauri-apps/api/core";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";
import { Archive } from "../types/archive";
// import App from "../App"; // Removed because App is a React component, not a state container
// Importing dataStore functions for database operations
import { saveArchive,
    getLastSyncedAt, getAllArchives, 
    getArchiveById, saveTome, getTomesByArchiveId, 
    getTomeById, saveEntry, getEntriesByTomeId, 
    getEntryById,
    getUpdatedTomesSince, getUpdatedEntriesSince,
 } from "../stores/dataStore";


async function NewTome(archive: Archive, name: string): Promise<Tome> {
    const tome: Tome = {
        id: crypto.randomUUID(),
        archive_id: archive.id,
        name: name,
        description: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entries: [], // Initialize with an empty array
    };

    await saveTome(tome);
    return tome;
}

async function NewEntry(tome: Tome, title: string): Promise<Entry> {
    const entry: Entry = {
        id: crypto.randomUUID(),
        tome_id: tome.id,
        name: title, // Using name for backwards compatibility
        content: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    await saveEntry(entry);
    return entry;
}

async function entrySave(entry: Entry) {
    let result = await saveEntry(entry);
    if (!result) {
        console.error(`Failed to save entry ${entry.id}`);
        return false;
    }
    else {
        console.log(`Entry ${entry.id} saved successfully`);
        return true;
    }
}

async function saveAllEntries(entries: Entry[]) {
    let updatedEntries: Entry[] = [];
    for (const entry of entries) {
        let result = await saveEntry(entry);
        if (!result) {
            console.error(`Failed to save entry ${entry.id}`);
            continue;
        }
        else {
            updatedEntries.push(entry);
        }
    }
    return updatedEntries;
}

async function exitApp(dirtyEntries: Entry[]) {
    // Save all entries before exiting
    if (dirtyEntries.length > 0) {
        await saveAllEntries(dirtyEntries);
    }
    // Close the app
    await invoke("exit_app");
    console.log("Exiting application...");
}

async function SaveShortcut(e: KeyboardEvent, entry: Entry) {
    if (e.ctrlKey && e.key === "s" && entry) {
        return await entrySave(entry);
    }
}

async function NewEntryShortcut(e: KeyboardEvent, tome: Tome, newEntryName: string) {
    if (e.ctrlKey && e.key === "n" && tome) {
        return await NewEntry(tome, newEntryName);
    }
}

async function getLastOpenedEntry(tome: Tome) {
    const lastSyncTime = await getLastSyncedAt();
    const lastSyncedEntries = await getUpdatedEntriesSince(lastSyncTime);

    const lastModifiedEntry = lastSyncedEntries.find(entry => entry.updated_at === lastSyncTime && entry.tome_id === tome.id) || null;
    return lastModifiedEntry;
}

async function OpenTome(tome: Tome, currentTome?: Tome) {
    if (currentTome && currentTome.id === tome.id) {
        console.log(`Tome ${tome.name} is already open.`);
        return currentTome;
    }

    const existingTome = await getTomeById(tome.id);
    if (!existingTome) {
        console.warn(`Tome ${tome.name} does not exist.`);
        return null;
    }

    await SelectTome(existingTome);
    return existingTome;
}

async function OpenTomeEntries(tome: Tome) {
    return await getEntriesByTomeId(tome.id);
}

async function SelectEntry(entry: Entry, tome: Tome) { 
    if (!entry || !tome) {
        console.error("Invalid entry or tome provided.");
        return null;
    }
    // TODO: Implement selection logic using context, props, or state management.
    // For now, just log the selection.
    console.log(`Selecting entry ${entry.name} in tome ${tome.name}.`);
    return entry;
}

async function SelectTome(tome: Tome | null) {
    if (!tome) {
        console.error("Invalid tome provided.");
        return null;
    }
    const returnedTome = getTomeById(tome.id);
    if (!returnedTome) {
        console.warn(`Tome ${tome.name} does not exist.`);
        return null;
    }
    return returnedTome;
}

async function getLastOpenedTome(archive: Archive) {
    const lastSyncTime = await getLastSyncedAt();
    if (!lastSyncTime) {
        console.warn("No last sync time found. Cannot determine last opened tome.");
        const firstTome = await getTomesByArchiveId(archive.id).then(tomes => tomes[0]);
        if (!firstTome) {
            console.warn(`No tomes found for archive ${archive.name}.`);
            return null;
        }
        return firstTome;
    }
    const lastSyncedTomes = await getUpdatedTomesSince(lastSyncTime);
    const lastModifiedTome = lastSyncedTomes.find(tome => tome.updated_at === lastSyncTime && tome.archive_id === archive.id);
    if (!lastModifiedTome) {
        console.warn(`No recently modified tome found for archive ${archive.name}.`);
        return null;
    }
    return lastModifiedTome;
}

async function MarkEntryDirty(entry: Entry, dirtyEntries: Entry[]) {
    if (entry && !dirtyEntries.includes(entry)) {
        dirtyEntries.push(entry);
    }
    return dirtyEntries;
}

async function SelectArchive(archive: Archive) {
    return getArchiveById(archive.id).then((selectedArchive) => {
        if (!selectedArchive) {
                console.warn(`Archive ${archive.name} does not exist.`);
            return null;
        }
        return selectedArchive;
    });
}

async function CreateArchive(archive: Archive) {
    saveArchive(archive).then(() => {
        console.log(`Archive ${archive.name} created successfully.`);
    });
    return archive;
}

async function OpenArchive(archive: Archive) {
    const tomes = await getTomesByArchiveId(archive.id);
    if (tomes.length === 0) {
        console.warn(`No tomes found for archive ${archive.name}.`);
        return [];
    }
    return tomes;
}

async function GetArchives() {
    const archives = await getAllArchives();
    if (archives.length === 0) {
        console.warn(`No archives found.`);
        return [];
    }
    return archives;
}

async function GetEntryContent(entry: Entry) {
    return await getEntryById(entry.id).then((fetchedEntry) => {
        if (!fetchedEntry) {
            console.warn(`Entry ${entry.name} does not exist.`);
            return null;
        }
        return fetchedEntry.content;
    }); 
}

async function NewTomeShortcut(e: KeyboardEvent, archive: Archive, newTomeName: string) {
    if (e.ctrlKey && e.key === "t" && archive) {
        return await NewTome(archive, newTomeName);
    }
}

export { NewTome, NewEntry, entrySave, saveAllEntries, exitApp, NewEntryShortcut, SelectTome, MarkEntryDirty, SaveShortcut,
SelectArchive, CreateArchive, OpenArchive, SelectEntry, GetArchives, GetEntryContent, NewTomeShortcut, OpenTome, getLastOpenedTome, getLastOpenedEntry, OpenTomeEntries };
