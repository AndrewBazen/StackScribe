import "./Styles/App.css";
import { MdEditor } from "./components/MpEditor";
import { useState, useEffect } from "react";
import { NavIconButton } from "./components/NavIconButton";
import EntryView from "./components/EntryView";
import { Entry } from "./types/entry";
import ArchiveTree from "./components/ArchiveTree";
import { Tome } from "./types/tome";  
import StartWindow from "./components/StartWindow";
import { Archive } from "./types/archive";
import { FilePlusIcon, GearIcon } from "@radix-ui/react-icons";
import { AppMenuBar } from "./components/AppMenuBar"; 
import { 
   NewTome, NewEntry, entrySave, saveAllEntries, exitApp,
   SaveShortcut, NewEntryShortcut, SelectTome, MarkEntryDirty,
   OpenArchive, SelectEntry, CreateArchive,
   GetArchives, GetEntryContent, NewTomeShortcut, OpenTome,
   getLastOpenedTome, getLastOpenedEntry,
   OpenTomeEntries} from "./Utils/AppUtils";
import PreviewPanel from "./components/PreviewPanel";
import NamePrompt from "./components/NamePrompt";
import { fullSync, syncFromServer } from "./lib/sync";
import { getDb } from "./lib/db";

const DIVIDER_SIZE = 2; // px

type DragTarget = null | "left" | "right";

function App() {
  const [leftWidth, setLeftWidth] = useState(250);   // side panel
  const [rightWidth, setRightWidth] = useState(300); // preview panel
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [markdown, setMarkdown] = useState("# Hello, World!\n\n*Write some markdown...*");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tome, setTome] = useState<Tome | null>(null);
  const [tomes, setTomes] = useState<Tome[]>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [archive, setArchive] = useState<Archive | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [dirtyEntries, setDirtyEntries] = useState<Entry[]>([]);
  const [newEntryName, setNewEntryName] = useState<string>("");
  const [newTomeName, setNewTomeName] = useState<string>("");

  // open an archive
  const handleArchiveOpen = async (selectedArchive: Archive) => {
    setArchive(selectedArchive);
    setTomes(await OpenArchive(selectedArchive));

    // Select the last opened tome
    const lastOpenedTome = await getLastOpenedTome(selectedArchive);
    await SelectTome(lastOpenedTome);
    setTome(lastOpenedTome);

    // Load entries for that tome
    if (!tome)  {
      console.error("No tome selected after opening archive:", selectedArchive);
      return;
    }
    setEntries(await OpenTomeEntries(tome));
    const lastOpenedEntry = await getLastOpenedEntry(tome);
    setEntry(lastOpenedEntry);
    if (!entry) {
      console.error("No entry selected after opening tome:", tome);
      return;
    }
    await SelectEntry(entry, tome);
    setMarkdown(await GetEntryContent(entry) ?? "");
  };

  // create a new archive and a new tome with an untitled entry
  const handleArchiveCreate = async (newArchive: Archive, tomeName: string) => {
    // Create the archive and persist it
    const createdArchive = await CreateArchive(newArchive);
    setArchive(createdArchive);

    if (!createdArchive) {
      console.error("Failed to create archive:", newArchive);
      return;
    }

    // Create a new tome in the archive using the proper NewTome function
    const createdTome = await NewTome(createdArchive, tomeName);
    setTomes([createdTome]);
    setTome(createdTome);

    // Create a default untitled entry in the new tome
    const newEntry = await NewEntry(createdTome, "Untitled Entry");
    setEntries([newEntry]);
    setEntry(newEntry);
    setMarkdown(await GetEntryContent(newEntry) ?? "");
  };

  // open a tome
  const handleTomeClick = async (clickedTome: Tome) => {

    if (!tome) {
      // If no tome is currently selected, select the clicked tome
      const selectedTome = await SelectTome(clickedTome);
       setTome(selectedTome);
      const openedTome = await OpenTome(clickedTome);
      const tomeEntries = await OpenTomeEntries(openedTome as Tome);
       setEntries(tomeEntries);
    }
    else if (tome.id !== clickedTome.id) {
      // If a different tome is selected, ensure any unsaved changes are handled
      if (dirtyEntries.length > 0) {
        // If the current entry is dirty, prompt to save it
        const shouldSave = window.confirm(`Save changes before switching tomes?`);
        if (shouldSave) {
          setDirtyEntries(await saveAllEntries(dirtyEntries as Entry[]));
        }
      }
       setTome(clickedTome);
      const openedTome = await OpenTome(clickedTome);
      if (!openedTome) {
        console.error("Failed to open tome:", clickedTome);
        return;
      }
      const tomeEntries = openedTome.entries as Entry[];
       setEntries(tomeEntries);
    }
  };

  // open an entry
  const handleEntryClick = async (entry: Entry) => {
     setEntry(entry);
    await SelectEntry(entry, tome as Tome);
    setMarkdown((await GetEntryContent(entry)) ?? "");
  };

  // save the entry when the user presses Ctrl+S
  const handleSave = async () => {
      let result = await entrySave(entry as Entry);
      if (result) {
        // If the entry was saved successfully, remove it from dirty entries
        setDirtyEntries(dirtyEntries.filter(e => e.id !== (entry as Entry).id));
        console.log("Entry saved successfully");
      } else {
        // If the save failed, log an error
        console.error("Failed to save entry");
      }
  };

  const handleSaveAll = async () => {
    setDirtyEntries(await saveAllEntries(dirtyEntries as Entry[]));
  };

  const handleEntryChanged = async (content: string) => {
    // update markdown shown in preview
    setMarkdown(content);

    // mark entry dirty for save-all logic
    if (entry) {
      // keep entry object in sync with text so Save uses the latest content
      const updatedEntry = { ...entry, content } as Entry;
       setEntry(updatedEntry);

      if (!dirtyEntries.includes(updatedEntry)) {
        setDirtyEntries(await MarkEntryDirty(updatedEntry, dirtyEntries as Entry[]));
      }
    }
  };

  //------ CREATE NEW TOME/ENTRY ------

  const handleNewTome = async (newTomeName: string) => {
    setNewTomeName(newTomeName);
    if (archive && !tomes.some(tome => tome.name === newTomeName)) {
      const newTome = await NewTome(archive as Archive, newTomeName);
       setTomes([...tomes, newTome]);
       setTome(newTome);
      setNewTomeName("");
      // Automatically create a default entry in the new tome
      const defaultEntry = await NewEntry(newTome, "Untitled Entry");
       setEntries([defaultEntry]);
       setEntry(defaultEntry);
      setMarkdown(await GetEntryContent(defaultEntry) || "");
    }
  };

    const handleNewEntry = async (newEntryName: string) => {
    setNewEntryName(newEntryName);
    if (tome && !entries.some(entry => entry.name === newEntryName)) {
      const newEntry = await NewEntry(tome as Tome, newEntryName);
       setEntries([...entries, newEntry]);
       setEntry(newEntry);
      setMarkdown(await GetEntryContent(newEntry) || "");
      setNewEntryName("");
    }
  };

  // Handle closing the app
  // This will prompt the user to save changes if there are dirty entries
  const handleClose = async () => {
    await exitApp(dirtyEntries as Entry[]);
  };

  // Handle preferences dialog
  const handlePreferences = async () => {
    // TODO: Implement preferences dialog
    console.log("Preferences dialog not implemented yet.");
  };

  // Handle entry saving via keyboard shortcut
  // This will save the current entry when the user presses Ctrl+S
  useEffect(() => {
    window.addEventListener("keydown", (e) => SaveShortcut(e, entry as Entry));
    return () => {
      window.removeEventListener("keydown", (e) => SaveShortcut(e, entry as Entry));
    };
  }, [entry]);


  // Handle new entry creation via keyboard shortcut
  // This will create a new entry in the currently selected tome
  useEffect(() => {
    window.addEventListener("keydown", async (e) => {
      const newEntry = await NewEntryShortcut(e, tome as Tome, newEntryName);
      if (newEntry) {
         setEntries([...entries, newEntry]);
      }
    });
    return () => {
      window.removeEventListener("keydown", (e) => NewEntryShortcut(e, tome as Tome, newEntryName));
    };
  }, [tome, newEntryName]);

  // Handle new tome creation via keyboard shortcut
  // This will create a new tome in the currently selected archive
  useEffect(() => {
    window.addEventListener("keydown", async (e) => {
      const newTome = await NewTomeShortcut(e, archive as Archive, newTomeName);
      if (newTome) {
         setTomes([...tomes, newTome]);
      }
    });
    return () => {
      window.removeEventListener("keydown", (e) => NewTomeShortcut(e, archive as Archive, newTomeName));
    };
  }, [archive, newTomeName]);

  // Handle unsaved changes before the user closes the window
  // This will prompt the user to save changes if there are dirty entries
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (dirtyEntries.length > 0) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger confirmation dialog
        await exitApp(dirtyEntries as Entry[]);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirtyEntries]);

  // Handle app state changes to sync data when the app becomes active
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === "active") {
        await fullSync();
      }
    };

    const visibilityChangeListener = () => {
      if (document.visibilityState === "visible") {
        handleAppStateChange("active");
      } else {
        handleAppStateChange("inactive");
      }
    };

    document.addEventListener("visibilitychange", visibilityChangeListener);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChangeListener);
    };
  }, []);

  // Initialize the app on first load
  // This will set up the database and sync data from the server
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing StackScribe...');
        
        // Initialize the database (migrations will run automatically via Tauri)
        const db = await getDb();
        console.log("✅ Database initialization completed successfully!");
        
        // Test basic database operations
        try {
          const tables = await db.select(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
          `) as Array<{ name: string }>;
          console.log('📊 Available tables:', tables);
          
          if (tables.length === 0) {
            console.warn('⚠️ No tables found! Migration may have failed.');
          }
        } catch (tableError) {
          console.error('❌ Failed to query tables:', tableError);
        }
        
        // Optionally sync from server on startup
        try {
          await syncFromServer();
          console.log("✅ Initial sync from server completed");
        } catch (syncError) {
          console.log("⚠️ Server sync failed (this is OK if offline):", syncError);
        }
      } catch (error) {
        console.error("❌ Failed to initialize app:", error);
        console.error("🔧 Check console for Tauri migration logs");
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const fetchArchives = async () => {
      try {
        const fetchedArchives = await GetArchives();
        await setArchives(fetchedArchives);
      } catch (error) {
        console.error("Failed to fetch archives:", error);
      }
    };

    fetchArchives();
  }, []);


  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (dragging === "left") {
        setLeftWidth(Math.min(Math.max(e.clientX, 150), window.innerWidth - rightWidth - 200));
      } else if (dragging === "right") {
        const newRight = Math.min(Math.max(window.innerWidth - e.clientX, 150), window.innerWidth - leftWidth - 200);
        setRightWidth(newRight);
      }
    };
    const stop = () => setDragging(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [dragging, leftWidth, rightWidth]);

  return (
    <>
    {/* Initialize the app on first load */}
    {/* This will set up the database and sync data from the server */}

    {/* NAME PROMPT */}
    {newEntryName && <NamePrompt title="New Entry" label="Entry Name" placeholder="Enter a name for the new entry" onConfirm={handleNewEntry} />}
    {newTomeName && <NamePrompt title="New Tome" label="Tome Name" placeholder="Enter a name for the new tome" onConfirm={handleNewTome} />}

    {/* START WINDOW */}
    <StartWindow archives={archives} onArchiveClick={handleArchiveOpen} onCreateArchive={handleArchiveCreate} />

    {/* MENU BAR */}
    <div className="menubar">
      <AppMenuBar
        onNewEntry={() => handleNewEntry(newEntryName)}
        onNewTome={() => handleNewTome(newTomeName)}
        onSave={handleSave}
        onSaveAll={handleSaveAll}
        onClose={handleClose}
        onPreferences={handlePreferences}
      />
    </div>

    {/* APP */}
    <div className="app">
      
      {/* LEFT PANEL */}
      <div className="side-panel" style={{ width: leftWidth }}>
        {/* TODO: right-click context menu for tomes */}
        {archive && <div className="tree-view"><ArchiveTree archive={archive} tomes={tomes} onTomeClick={handleTomeClick}/></div>}
        <div className="panel-nav">
          <NavIconButton icon={<GearIcon/>} onClick={handlePreferences} />
          <NavIconButton icon={<FilePlusIcon/>} onClick={() => handleNewEntry(newEntryName)} />
        </div>
      </div>

      {/* ENTRY VIEW */}
      {tome && <div className="entry-view-panel"><EntryView entries={entries} onEntryClick={handleEntryClick} /></div>}

      {/* EDITOR */}
      <div id="editor-container" 
        className="panel" 
        style={{ flex: 1 }}
      >
        <MdEditor value={markdown} onEntryChange={handleEntryChanged} />
      </div>

      {/* DIVIDER */}
      <div
        className="divider"
        onMouseDown={() => setDragging("right")}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* PREVIEW PANEL */}
      <div
        id="preview-container"
        className="panel"
        style={{ width: rightWidth, overflow: "auto", padding: "1rem" }}
      >
        <PreviewPanel markdown={markdown} />
      
      </div>
    </div>
    </>
  );
}

export default App;
