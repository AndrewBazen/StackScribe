import type { Archive } from "../types/archive";
import type { Tome } from "../types/tome";
import type { Entry } from "../types/entry";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
    }

    return response.json();
}

export const apiClient = {

    getArchives: (): Promise<Archive[]> => fetchJson("/archives"),
    getTomes: (archiveId: string): Promise<Tome[]> => fetchJson(`/archives/${archiveId}/tomes`),
    getEntries: (tomeId: string): Promise<Entry[]> => fetchJson(`/tomes/${tomeId}/entries`),

    createArchive: (archive: { name: string, description?: string }) =>
        fetchJson("/archives", {
            method: "POST",
            body: JSON.stringify(archive),
        }),
    createTome: (archiveId: string, tome: { name: string }) =>
        fetchJson(`/archives/${archiveId}/tomes`, {
            method: "POST",
            body: JSON.stringify(tome),
        }),
    createEntry: (tomeId: string, entry: { name: string, content?: string }) =>
        fetchJson(`/tomes/${tomeId}/entries`, {
            method: "POST",
            body: JSON.stringify(entry),
        }),
    deleteArchive: (archiveId: string) =>
        fetchJson(`/archives/${archiveId}`, {
            method: "DELETE",
        }),
    deleteTome: (tomeId: string) =>
        fetchJson(`/tomes/${tomeId}`, {
            method: "DELETE",
        }),
    deleteEntry: (entryId: string) =>
        fetchJson(`/entries/${entryId}`, {
            method: "DELETE",
        }),
    updateEntry: (entryId: string, entry: { name: string }) =>
        fetchJson(`/entries/${entryId}`, {
            method: "PUT",
            body: JSON.stringify(entry),
        }),
    updateTome: (tomeId: string, tome: { name: string }) =>
        fetchJson(`/tomes/${tomeId}`, {
            method: "PUT",
            body: JSON.stringify(tome),
        }),
    updateArchive: (archiveId: string, archive: { name: string }) =>
        fetchJson(`/archives/${archiveId}`, {
            method: "PUT",
            body: JSON.stringify(archive),
        }),
    getArchiveById: (archiveId: string): Promise<Archive> =>
        fetchJson(`/archives/${archiveId}`),
    getTomeById: (tomeId: string): Promise<Tome> =>
        fetchJson(`/tomes/${tomeId}`),
    getEntryById: (entryId: string): Promise<Entry> =>
        fetchJson(`/entries/${entryId}`),
}