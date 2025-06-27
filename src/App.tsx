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
   NewTome, NewEntry, Save, SaveAll, Close, Preferences,
   SaveShortcut, NewEntryShortcut, SelectTome, MarkEntryDirty,
   SelectArchive, OpenArchive, SelectEntry,
   GetArchives, GetEntryContent, NewTomeShortcut, OpenTome,
   getLastOpenedTome, getLastOpenedEntry, OpenTomeEntries } from "./Utils/AppUtils";
import PreviewPanel from "./components/PreviewPanel";
import NamePrompt from "./components/NamePrompt";

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
    // Persist last selected archive for next session
    await SelectArchive(selectedArchive);

    // Load tomes for the archive we just opened
    const tomes = (await OpenArchive(selectedArchive)) as Tome[];

    // Keep archive state in sync with its tomes so the tree view renders
    const archiveWithTomes = { ...selectedArchive, tomes };
    setArchive(archiveWithTomes);
    setTomes(tomes);

    // Select the last opened tome
    const lastOpenedTome = await getLastOpenedTome(archiveWithTomes);
    await SelectTome(lastOpenedTome);
    setTome(lastOpenedTome);

    // Load entries for that tome
    const tomeEntries = (await OpenTome(lastOpenedTome)) as Entry[];
    setEntries(tomeEntries);

    // If the tome has no entries, create a default one
    let initialEntry: Entry;
    if (tomeEntries.length === 0) {
      initialEntry = await NewEntry(lastOpenedTome, "Untitled");
      setEntries([initialEntry]);
    } else {
      initialEntry = await getLastOpenedEntry(lastOpenedTome);
    }

    setEntry(initialEntry);
    await SelectEntry(initialEntry, lastOpenedTome);
    setMarkdown(await GetEntryContent(initialEntry));
  };

  // create a new archive and a new tome with an untitled entry
  const handleArchiveCreate = async (newArchive: Archive) => {
    // Attach the newly created tome to the archive before storing it in state
    setArchive(newArchive);
    setTomes(newArchive.tomes);
    setTome(newArchive.tomes[0]);
    setEntries(await OpenTomeEntries(newArchive.tomes[0] as Tome));
    let newEntry = await getLastOpenedEntry(newArchive.tomes[0] as Tome);
    setEntry(newEntry);
    await SelectEntry(newEntry, newArchive.tomes[0] as Tome);
    setMarkdown(await GetEntryContent(newEntry));
    setNewTomeName("");
    setNewEntryName("");
  };

  // open a tome
  const handleTomeClick = async (clickedTome: Tome) => {
    // Always keep selected tome in state first
    setTome(clickedTome);

    // Load entries from backend for this tome and check if any are currently dirty
    // if they are, don't reload them
    const fetchedEntries = (await OpenTome(clickedTome)) as Entry[];
    if (fetchedEntries.length > 0) {
      const unchangedEntries = fetchedEntries.filter(entry => !dirtyEntries.some(e => e.id === entry.id));
      console.log("unchanged entries", unchangedEntries);
      console.log("dirty entries", dirtyEntries);
      setEntries([...unchangedEntries, ...dirtyEntries]);
    } else {
      setEntries(fetchedEntries);
      console.log("no entries");
    }

    // if the tome has entries, pick the last opened entry and select it
    if (fetchedEntries.length > 0) {
      const lastOpenedEntry = await getLastOpenedEntry(clickedTome);
      setEntry(lastOpenedEntry);
      await SelectEntry(lastOpenedEntry, clickedTome);
      setMarkdown(await GetEntryContent(lastOpenedEntry));
    } else {
      // Tome is empty – create default untitled entry
      const newEntry = await NewEntry(clickedTome, newEntryName);
      setEntries([newEntry]);
      setEntry(newEntry);
      await SelectEntry(newEntry, clickedTome);
      setMarkdown(await GetEntryContent(newEntry));
      setNewEntryName("");
    }
  };

  // open an entry
  const handleEntryClick = async (entry: Entry) => {
    setEntry(entry);
    await SelectEntry(entry, tome as Tome);
    setMarkdown(await GetEntryContent(entry));
  };

  // save the entry when the user presses Ctrl+S
  const handleSave = async () => {
      await Save(entry as Entry);
  };

  const handleSaveAll = async () => {
    await SaveAll(dirtyEntries as Entry[]);
    setDirtyEntries([]);
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

  const handleNewTome = async (newTomeName: string) => {
    setNewTomeName(newTomeName);
    if (archive && !tomes.some(tome => tome.name === newTomeName)) {
      const newTome = await NewTome(archive as Archive, newTomeName);
      setTomes([...tomes, newTome]);
      setTome(newTome);
      const newEntry = await NewEntry(newTome, newEntryName);
      setEntries([newEntry]);
      setEntry(newEntry);
      setMarkdown(await GetEntryContent(newEntry));
      setNewTomeName("");
      setNewEntryName("");
    }
  };

    const handleNewEntry = async (newEntryName: string) => {
    setNewEntryName(newEntryName);
    if (tome && !entries.some(entry => entry.name === newEntryName)) {
      const newEntry = await NewEntry(tome as Tome, newEntryName);
      setEntries([...entries, newEntry]);
      setEntry(newEntry);
      setMarkdown(await GetEntryContent(newEntry));
      setNewEntryName("");
    }
  };

  const handleClose = async () => {
    await Close();
  };

  const handlePreferences = async () => {
    await Preferences();
  };

  useEffect(() => {
    window.addEventListener("keydown", (e) => SaveShortcut(e, entry as Entry));
    return () => {
      window.removeEventListener("keydown", (e) => SaveShortcut(e, entry as Entry));
    };
  }, [entry]);

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

  useEffect(() => {
    const getArchives = async () => {
      const archives = await GetArchives();
      setArchives(archives);
    };
    getArchives();
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
        {/* archive is set in the start window */}
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
