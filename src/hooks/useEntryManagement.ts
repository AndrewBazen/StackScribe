import { useState, useRef, useCallback } from "react";
import { Entry } from "../types/entry";
import { Tome } from "../types/tome";
import { Archive } from "../types/archive";
import { CreateEntry, saveLocalEntry, saveAllEntries } from "../utils/appUtils";
import { saveEntry } from "../stores/dataStore";
import { aiLinkService } from "../services/aiLinkService";

interface EntryManagementState {
  entries: Entry[];
  entry: Entry | null;
  markdown: string;
  dirtyEntries: Entry[];
  tabbedEntries: Entry[];
  activeTabId: string | null;
  entryRefreshKey: number;
}

interface EntryManagementActions {
  setEntries: (entries: Entry[]) => void;
  setEntry: (entry: Entry | null) => void;
  setMarkdown: (markdown: string) => void;
  handleEntryClick: (entry: Entry) => void;
  handleEntryChanged: (content: string) => void;
  handleSave: () => Promise<void>;
  handleSaveAll: () => Promise<void>;
  handleNewEntry: (name: string, entryType: Entry["entry_type"]) => Promise<void>;
  handleRenameEntry: (entry: Entry) => Promise<void>;
  handleDeleteEntry: (entry: Entry) => Promise<void>;
  handleTabSelect: (id: string) => void;
  handleTabClose: (id: string) => void;
  handleTabReorder: (dragId: string, targetId: string) => void;
  handleCreateTab: (entry: Entry) => void;
  clearEntryState: () => void;
}

interface UseEntryManagementOptions {
  tome: Tome | null;
  archive: Archive | null;
  showAISuggestions: boolean;
  onAISuggestionsRefresh?: () => void;
}

export function useEntryManagement(
  options: UseEntryManagementOptions
): EntryManagementState & EntryManagementActions {
  const { tome, archive, showAISuggestions, onAISuggestionsRefresh } = options;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [markdown, setMarkdown] = useState("# Hello, World!\n\n*Write some markdown...*");
  const [dirtyEntries, setDirtyEntries] = useState<Entry[]>([]);
  const [tabbedEntries, setTabbedEntries] = useState<Entry[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [entryRefreshKey, setEntryRefreshKey] = useState(0);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSuggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCreateTab = useCallback((newEntry: Entry) => {
    setTabbedEntries(prev => {
      if (prev.some(e => e.id === newEntry.id)) return prev;
      return [...prev, newEntry];
    });
    setActiveTabId(newEntry.id);
  }, []);

  const handleTabSelect = useCallback((id: string) => {
    setActiveTabId(id);
    setTabbedEntries(prev => {
      const selected = prev.find(e => e.id === id);
      if (selected) {
        setEntry(selected);
        setMarkdown(selected.content ?? "");
      }
      return prev;
    });
  }, []);

  const handleTabClose = useCallback((id: string) => {
    setTabbedEntries(prev => {
      const remaining = prev.filter(e => e.id !== id);
      setActiveTabId(currentActiveId => {
        if (id === currentActiveId) {
          if (remaining.length > 0) {
            const newActive = remaining[remaining.length - 1];
            setEntry(newActive);
            setMarkdown(newActive.content ?? "");
            return newActive.id;
          } else {
            setEntry(null);
            setMarkdown("");
            return null;
          }
        }
        return currentActiveId;
      });
      return remaining;
    });
  }, []);

  const handleTabReorder = useCallback((dragId: string, targetId: string) => {
    setTabbedEntries(prev => {
      const dragIndex = prev.findIndex(e => e.id === dragId);
      const targetIndex = prev.findIndex(e => e.id === targetId);
      if (dragIndex === -1 || targetIndex === -1) return prev;
      const reordered = [...prev];
      const [dragged] = reordered.splice(dragIndex, 1);
      reordered.splice(targetIndex, 0, dragged);
      return reordered;
    });
  }, []);

  const handleEntryClick = useCallback((e: Entry) => {
    setEntry(e);
    handleCreateTab(e);
    setMarkdown(e.content ?? "");
  }, [handleCreateTab]);

  const handleSave = useCallback(async () => {
    if (!entry) return;

    entry.updated_at = new Date().toISOString();
    const result = await saveEntry(entry);

    if (result) {
      setDirtyEntries(prev => prev.filter(e => e.id !== entry.id));
      console.log(`Entry ${entry.name} saved successfully`);

      if (tome) {
        await aiLinkService.indexEntries([entry], { archiveId: archive?.id, tomeId: tome.id });
        if (showAISuggestions && onAISuggestionsRefresh) {
          onAISuggestionsRefresh();
        }
      }
    } else {
      console.error("Failed to save entry ", entry.name);
    }
  }, [entry, tome, archive, showAISuggestions, onAISuggestionsRefresh]);

  const handleSaveAll = useCallback(async () => {
    const remaining = await saveAllEntries(dirtyEntries);
    setDirtyEntries(remaining);
  }, [dirtyEntries]);

  const handleEntryChanged = useCallback((content: string) => {
    setMarkdown(content);

    if (!entry) return;

    entry.content = content;
    entry.updated_at = new Date().toISOString();

    setDirtyEntries(prev => {
      if (prev.some(e => e.id === entry.id)) return prev;
      return [...prev, entry];
    });

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(async () => {
      await saveLocalEntry(entry);
      setDirtyEntries(prev => prev.filter(e => e.id !== entry.id));

      if (tome) {
        await aiLinkService.indexEntries([entry], { archiveId: archive?.id, tomeId: tome.id });
      }

      if (showAISuggestions && onAISuggestionsRefresh) {
        if (aiSuggestTimeout.current) clearTimeout(aiSuggestTimeout.current);
        aiSuggestTimeout.current = setTimeout(() => {
          onAISuggestionsRefresh();
        }, 600);
      }
    }, 1000);
  }, [entry, tome, archive, showAISuggestions, onAISuggestionsRefresh]);

  const handleNewEntry = useCallback(async (
    newEntryName: string,
    entryType: Entry["entry_type"]
  ) => {
    if (tome && !entries.some(e => e.name === newEntryName)) {
      const newEntry = await CreateEntry(tome, newEntryName, entryType);
      setEntries(prev => [...prev, newEntry]);
      setEntry(newEntry);
      handleCreateTab(newEntry);
      setMarkdown(newEntry.content || "");
      setEntryRefreshKey(prev => prev + 1);
    }
  }, [tome, entries, handleCreateTab]);

  const handleRenameEntry = useCallback(async (entryToRename: Entry) => {
    const newName = prompt("New entry name", entryToRename.name);
    if (!newName || newName === entryToRename.name) return;

    entryToRename.name = newName;
    entryToRename.updated_at = new Date().toISOString();
    await saveEntry(entryToRename);
    setEntries(prev => [...prev]);
    setEntryRefreshKey(prev => prev + 1);
  }, []);

  const handleDeleteEntry = useCallback(async (entryToDelete: Entry) => {
    if (confirm(`Delete "${entryToDelete.name}"?`)) {
      await saveEntry(entryToDelete);
      setEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
      setTabbedEntries(prev => prev.filter(e => e.id !== entryToDelete.id));
      setActiveTabId(prev => prev === entryToDelete.id ? null : prev);
      setEntryRefreshKey(prev => prev + 1);
    }
  }, []);

  const clearEntryState = useCallback(() => {
    setEntries([]);
    setEntry(null);
    setTabbedEntries([]);
    setActiveTabId(null);
    setMarkdown("");
  }, []);

  return {
    entries,
    entry,
    markdown,
    dirtyEntries,
    tabbedEntries,
    activeTabId,
    entryRefreshKey,
    setEntries,
    setEntry,
    setMarkdown,
    handleEntryClick,
    handleEntryChanged,
    handleSave,
    handleSaveAll,
    handleNewEntry,
    handleRenameEntry,
    handleDeleteEntry,
    handleTabSelect,
    handleTabClose,
    handleTabReorder,
    handleCreateTab,
    clearEntryState,
  };
}
