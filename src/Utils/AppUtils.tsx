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
    getSortedAndUpdated,
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
    // Instead of using sync time, just get the most recently updated entry
    console.log(`Getting most recently updated entry for tome: ${tome.name}`);
    const sortedEntries = await getSortedAndUpdated(tome, "entry");
    if (!sortedEntries || sortedEntries.length === 0) {
        console.warn(`No entries found for tome ${tome.name}.`);
        return null;
    }
    return sortedEntries[0];
}


/** OpenTome - gets a specified tome from the database and returns it to the app
 *
 * @param {Tome} tome
 * @param {Tome} [currentTome]
 * @return {*} 
 */
async function OpenTome(tome: Tome): Promise<Tome | null> {
    // get the tome from the database
    const existingTome = await getTomeById(tome.id);
    if (!existingTome) {
        console.warn(`Tome ${tome.name} does not exist.`);
        return null;
    }
    // return the tome
    return existingTome;
}

/** OpenEntry - gets the entry data from the database and returns it.
 *
 * @param {Entry} entry
 * @param {Tome} tome
 * @return {Entry}
 */
async function OpenEntry(entry: Entry){ 
    // database
    if (!entry) {
        console.error("Invalid entry or tome provided.");
        return null;
    }
    const returnedEntry = await getEntryById(entry.id);
    return returnedEntry;
}

/** getLastOpenedTome - gets the tome that was last modified in the selected archive
 *
 * @param {Archive} archive
 * @return {*} 
 */
async function getLastOpenedTome(archive: Archive) {
    // Instead of using sync time, just get the most recently updated tome
    console.log(`Getting most recently updated tome for archive: ${archive.name}`);
    const sortedTomes = await getSortedAndUpdated(archive, "tome")
    if (!sortedTomes || sortedTomes.length === 0) {
        console.warn(`No tomes found for archive ${archive.name}.`);
        return null;
    }
    return sortedTomes[0];
}

async function MarkEntryDirty(entry: Entry, dirtyEntries: Entry[]){
    if (entry && !dirtyEntries.includes(entry)) {
        dirtyEntries.push(entry);
    }
    return dirtyEntries;
}

async function OpenArchive(archive: Archive): Promise<Archive | null> {
    const selectedArchive = await getArchiveById(archive.id)
    if (!selectedArchive) {
            console.warn(`Archive ${archive.name} does not exist.`);
        return null;
    }
    return selectedArchive;
}

async function CreateArchive(archive: Archive): Promise<Archive | null> {
    if (!archive) {
        console.error("Invalid archive, unable to create new archive");
        return null;
    }
    saveArchive(archive).then(() => {
        console.log(`Archive ${archive.name} created successfully.`);
    });
    return archive;
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
    const fetchedEntry = await getEntryById(entry.id);
    if (!fetchedEntry?.content) {
        console.error("Unable to fetch entry content.");
        return null;
    }
    return fetchedEntry.content;
}

async function NewTomeShortcut(e: KeyboardEvent, archive: Archive, newTomeName: string) {
    if (e.ctrlKey && e.key === "t" && archive) {
        return await NewTome(archive, newTomeName);
    }
}

export { NewTome, NewEntry, entrySave, saveAllEntries, exitApp, NewEntryShortcut, MarkEntryDirty, SaveShortcut,
     CreateArchive, OpenArchive, GetArchives, GetEntryContent, NewTomeShortcut, OpenTome, getLastOpenedTome, getLastOpenedEntry };
