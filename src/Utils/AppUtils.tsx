import { invoke } from "@tauri-apps/api/core";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";
import { Archive } from "../types/archive";


async function NewTome(archive: Archive, name: string) {
    const tome = await invoke("create_tome", { archive, tomeName: name }) as unknown as Tome;
    return tome;
}

async function NewEntry(tome: Tome, name: string) {
    const entry = await invoke("create_entry", { tome, entryName: name }) as unknown as Entry;
    return entry;
}

async function Save(entry: Entry) {
    await invoke("save_entry", { entry, content: entry.content });
    return entry;
}

async function SaveAll(entries: Entry[]) {
    for (const entry of entries) {
        await invoke("save_entry", { entry, content: entry.content });
    }
    return entries;
}

async function Close() {
    console.warn("close_app command not implemented in backend yet");
}

async function Preferences() {
    console.warn("open_preferences command not implemented in backend yet");
}

async function SaveShortcut(e: KeyboardEvent, entry: Entry) {
    if (e.ctrlKey && e.key === "s" && entry) {
        await Save(entry);
    }
}

async function NewEntryShortcut(e: KeyboardEvent, tome: Tome, newEntryName: string) {
    if (e.ctrlKey && e.key === "n" && tome) {
        return await NewEntry(tome, newEntryName);
    }
}

async function getLastOpenedEntry(tome: Tome) {
    const lastOpenedEntry = await invoke("get_last_selected_entry", { tome: tome }) as unknown as Entry;
    return lastOpenedEntry;
}

async function OpenTome(tome: Tome, currentTome?: Tome) {
    if (currentTome && tome.id === currentTome.id) {
        return currentTome.entries;
    }
    return await invoke("get_entries", { tome: tome }) as unknown as Entry[];
}

async function OpenTomeEntries(tome: Tome) {
    return await invoke("get_entries", { tome: tome }) as unknown as Entry[];
}

async function SelectEntry(entry: Entry, tome: Tome) { 
    await invoke("set_last_selected_entry", { tome: tome, entry: entry });
    await invoke("get_entry_content", { entry: entry });
    return entry;
}

async function SelectTome(tome: Tome) {
    await invoke("set_last_selected_tome", { tome: tome });
    return tome;
}

async function getLastOpenedTome(archive: Archive) {
    const lastOpenedTome = await invoke("get_last_selected_tome", { archive: archive }) as unknown as Tome;
    return lastOpenedTome;
}

async function MarkEntryDirty(entry: Entry, dirtyEntries: Entry[]) {
    if (entry && !dirtyEntries.includes(entry)) {
        dirtyEntries.push(entry);
    }
    return dirtyEntries;
}

async function SelectArchive(archive: Archive) {
    return archive;
}

async function CreateArchive(archive: Archive) {
    await invoke("create_archive", { archiveName: archive.name });
    return archive;
}

async function OpenArchive(archive: Archive) {
    const tomes = await invoke("get_tomes", { archive }) as unknown as Tome[];
    return tomes;
}

async function GetArchives() {
    const archives = await invoke("get_archives") as unknown as Archive[];
    return archives;
}

async function GetEntryContent(entry: Entry) {
    const content = await invoke("get_entry_content", { entry }) as unknown as string;
    return content;
}

async function NewTomeShortcut(e: KeyboardEvent, archive: Archive, newTomeName: string) {
    if (e.ctrlKey && e.key === "t" && archive) {
        return await NewTome(archive, newTomeName);
    }
}

export { NewTome, NewEntry, Save, SaveAll, Close, Preferences,
SaveShortcut, NewEntryShortcut, SelectTome, MarkEntryDirty,
SelectArchive, CreateArchive, OpenArchive, SelectEntry, GetArchives, GetEntryContent, NewTomeShortcut, OpenTome, getLastOpenedTome, getLastOpenedEntry, OpenTomeEntries };

