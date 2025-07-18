import { invoke } from "@tauri-apps/api/core";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";
import { Archive } from "../types/archive";
// import App from "../App"; // Removed because App is a React component, not a state container
// Importing dataStore functions for database operations
import { saveArchive,
    getAllArchives, 
    getArchiveById, saveTome,
    getTomeById, saveEntry, 
    getEntryById,
    getSortedAndUpdated,
 } from "../stores/dataStore";


async function CreateTome(archive: Archive, name: string): Promise<Tome> {
    const tome: Tome = {
        id: crypto.randomUUID(),
        archive_id: archive.id,
        name: name,
        description: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    await saveTome(tome);
    return tome;
}

async function CreateEntry(tome: Tome, title: string, entry_type: "generic" | "requirement" | "specification" | "meeting" | "design" | "implementation" | "test" | "other" = "generic"): Promise<Entry> {
    const entry: Entry = {
        id: crypto.randomUUID(),
        tome_id: tome.id,
        name: title, // Using name for backwards compatibility
        content: "",
        entry_type: entry_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    await saveEntry(entry);
    return entry;
}

async function saveLocalEntry(entry: Entry) {
    // Refresh timestamp so database considers this a newer version
    entry.updated_at = new Date().toISOString();
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
        entry.updated_at = new Date().toISOString();
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

// TODO: update
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
        return await saveLocalEntry(entry);
    }
}

async function NewEntryShortcut(e: KeyboardEvent, tome: Tome, newEntryName: string) {
    if (e.ctrlKey && e.key === "n" && tome) {
        return await CreateEntry(tome, newEntryName, "generic");
    }
}

async function getLastOpenedEntry(tome: Tome) {
    // Instead of using sync time, just get the most recently updated entry
    console.log(`Getting most recently updated entry for tome: ${tome.name}`);
    const sortedEntries = await getSortedAndUpdated(tome, "entry") as Entry[];
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
    const sortedTomes = await getSortedAndUpdated(archive, "tome") as Tome[];
    if (!sortedTomes || sortedTomes.length === 0) {
        console.warn(`No tomes found for archive ${archive.name}.`);
        return null;
    }
    return sortedTomes[0] as Tome;
}

async function MarkEntryDirty(entry: Entry, dirtyEntries: Entry[]){
    if (!entry) return dirtyEntries;
    // Return a fresh array so React state updates trigger a re-render
    if (dirtyEntries.some(e => e.id === entry.id)) {
        return dirtyEntries;
    }
    return [...dirtyEntries, entry];
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
        return await CreateTome(archive, newTomeName);
    }
}

export { CreateEntry, CreateTome, saveLocalEntry, OpenEntry, saveAllEntries, exitApp, NewEntryShortcut, MarkEntryDirty, SaveShortcut,
     CreateArchive, OpenArchive, GetArchives, GetEntryContent, NewTomeShortcut, OpenTome, getLastOpenedTome, getLastOpenedEntry };
