import { useState, useEffect, useCallback } from "react";
import { Archive } from "../types/archive";
import { Tome } from "../types/tome";
import { Entry } from "../types/entry";
import { SyncStatus } from "../lib/sync";
import { CreateTome, CreateEntry, OpenArchive, CreateArchive, GetArchives } from "../utils/appUtils";
import { getTomesByArchiveId } from "../stores/dataStore";

interface ArchiveManagementState {
  archive: Archive | null;
  archives: Archive[];
  tome: Tome | null;
  tomes: Tome[];
}

interface ArchiveManagementActions {
  setTome: (tome: Tome | null) => void;
  setTomes: (tomes: Tome[]) => void;
  handleArchiveOpen: (selectedArchive: Archive) => Promise<void>;
  handleArchiveCreate: (newArchive: Archive, tomeName: string) => Promise<{
    archive: Archive;
    tome: Tome;
    entry: Entry;
  } | null>;
  handleTomeClick: (clickedTome: Tome, entries: Entry[]) => void;
  handleNewTome: (tomeName: string) => Promise<{ tome: Tome; entry: Entry } | null>;
  refreshArchives: () => Promise<void>;
}

interface UseArchiveManagementOptions {
  syncStatus: SyncStatus;
  onArchiveOpened?: () => void;
  onTomeSelected?: (tome: Tome, entries: Entry[]) => void;
}

export function useArchiveManagement(
  options: UseArchiveManagementOptions
): ArchiveManagementState & ArchiveManagementActions {
  const { syncStatus, onArchiveOpened, onTomeSelected } = options;

  const [archive, setArchive] = useState<Archive | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [tome, setTome] = useState<Tome | null>(null);
  const [tomes, setTomes] = useState<Tome[]>([]);

  const refreshArchives = useCallback(async () => {
    try {
      const fetchedArchives = await GetArchives();
      setArchives(fetchedArchives);
    } catch (error) {
      console.error("Failed to fetch archives:", error);
    }
  }, []);

  // Fetch archives when sync is ready
  useEffect(() => {
    if (syncStatus.isReady) {
      refreshArchives();
    }
  }, [syncStatus.isReady, refreshArchives]);

  const handleArchiveOpen = useCallback(async (selectedArchive: Archive) => {
    if (!syncStatus.isReady) {
      console.warn('⚠️ Cannot open archive while sync is in progress');
      return;
    }

    const openedArchive = await OpenArchive(selectedArchive);
    setArchive(openedArchive);

    const openedTomes = await getTomesByArchiveId(selectedArchive.id);
    setTomes(openedTomes);

    setTome(null);
    onArchiveOpened?.();
  }, [syncStatus.isReady, onArchiveOpened]);

  const handleArchiveCreate = useCallback(async (
    newArchive: Archive,
    tomeName: string
  ): Promise<{ archive: Archive; tome: Tome; entry: Entry } | null> => {
    if (!syncStatus.isReady) {
      console.warn('⚠️ Cannot create archive while sync is in progress');
      return null;
    }

    const createdArchive = await CreateArchive(newArchive);
    if (!createdArchive) {
      console.error("Failed to create archive:", newArchive);
      return null;
    }
    setArchive(createdArchive);

    // Refresh archives list so the new archive appears in the selection dialog
    await refreshArchives();

    const createdTome = await CreateTome(createdArchive, tomeName);
    if (!createdTome) {
      console.error("Failed to create tome:", tomeName);
      return null;
    }
    setTomes([createdTome]);
    setTome(createdTome);

    const createdEntry = await CreateEntry(createdTome, "Untitled Entry", "generic");
    if (!createdEntry) {
      console.error("Failed to create entry: Untitled_Entry.md");
      return null;
    }

    return { archive: createdArchive, tome: createdTome, entry: createdEntry };
  }, [syncStatus.isReady, refreshArchives]);

  const handleTomeClick = useCallback((clickedTome: Tome, entries: Entry[]) => {
    if (!clickedTome) {
      console.error("Selected tome does not exist.");
      return;
    }

    if (tome?.id !== clickedTome.id) {
      setTome(clickedTome);
      onTomeSelected?.(clickedTome, entries);
    } else {
      console.warn("Selected tome is already open:", clickedTome.name);
    }
  }, [tome, onTomeSelected]);

  const handleNewTome = useCallback(async (
    newTomeName: string
  ): Promise<{ tome: Tome; entry: Entry } | null> => {
    if (!archive || tomes.some(t => t.name === newTomeName)) {
      return null;
    }

    const newTome = await CreateTome(archive, newTomeName);
    setTomes(prev => [...prev, newTome]);
    setTome(newTome);

    const defaultEntry = await CreateEntry(newTome, "Untitled Entry", "generic");

    return { tome: newTome, entry: defaultEntry };
  }, [archive, tomes]);

  return {
    archive,
    archives,
    tome,
    tomes,
    setTome,
    setTomes,
    handleArchiveOpen,
    handleArchiveCreate,
    handleTomeClick,
    handleNewTome,
    refreshArchives,
  };
}
