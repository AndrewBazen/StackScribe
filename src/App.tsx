import "./App.css";
import { MdEditor } from "./components/MpEditor";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NavIconButton } from "./components/NavIconButton";
import EntryView from "./components/EntryView";
import { Entry } from "./types/entry";
import ArchiveTree from "./components/ArchiveTree";
import { Tome } from "./types/tome";  
import StartWindow from "./components/StartWindow";
import { Archive } from "./types/archive";
import { DotsHorizontalIcon, FilePlusIcon, GearIcon } from "@radix-ui/react-icons";
import { AppMenuBar } from "./components/AppMenuBar"; 
import { NewTome, NewEntry, Save, SaveAll, Close, Preferences,
  SaveShortcut, NewEntryShortcut, SelectTome, MarkEntryDirty,
  SelectArchive, CreateArchive, OpenArchive, SelectEntry, GetArchives, GetEntryContent, NewTomeShortcut, OpenTome } from "./Utils/AppUtils";

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

    // If the archive has no tomes yet, create one automatically
    if (tomes.length === 0) {
      const newTome = await NewTome(archiveWithTomes, "Untitled");

      // Update state collections so the UI tree shows the new tome immediately
      setTomes([newTome]);
      setArchive({ ...archiveWithTomes, tomes: [newTome] });

      setTome(newTome);
      setEntries(await OpenTome(newTome) as Entry[]);
      const newEntry = await NewEntry(newTome, "Untitled");
      setEntry(newEntry);
      await SelectEntry(newEntry, newTome);
      setMarkdown(await GetEntryContent(newEntry));
      return;
    }

    // Select the first tome for now (could be enhanced to use last-opened later)
    const firstTome = tomes[0];
    await SelectTome(firstTome);
    setTome(firstTome);

    // Load entries for that tome
    const tomeEntries = (await OpenTome(firstTome)) as Entry[];
    setEntries(tomeEntries);

    // If the tome has no entries, create a default one
    let initialEntry: Entry;
    if (tomeEntries.length === 0) {
      initialEntry = await NewEntry(firstTome, "Untitled");
      setEntries([initialEntry]);
    } else {
      initialEntry = tomeEntries[0];
    }

    setEntry(initialEntry);
    await SelectEntry(initialEntry, firstTome);
    setMarkdown(await GetEntryContent(initialEntry));
  };

  // create a new archive and a new tome with an untitled entry
  const handleArchiveCreate = async (archive: Archive) => {
    const newTome = await NewTome(archive, "Untitled") as unknown as Tome;
    // Attach the newly created tome to the archive before storing it
    const archiveWithTome = { ...archive, tomes: [newTome] } as unknown as Archive;
    setArchive(archiveWithTome);
    setTomes([newTome]);
    setTome(newTome);
    setEntries(await OpenTome(newTome) as Entry[]);
    let newEntry = await NewEntry(newTome, "Untitled");
    setEntry(newEntry);
    await SelectEntry(newEntry, newTome as Tome);
    setMarkdown(await GetEntryContent(newEntry));
  };

  // open a tome
  const handleTomeClick = async (clickedTome: Tome) => {
    // Always keep selected tome in state first
    setTome(clickedTome);

    // Load entries from backend for this tome
    const fetchedEntries = (await OpenTome(clickedTome)) as Entry[];
    setEntries(fetchedEntries);

    if (fetchedEntries.length > 0) {
      // Pick the first entry for now (enhance later to remember last)
      const firstEntry = fetchedEntries[0];
      setEntry(firstEntry);
      await SelectEntry(firstEntry, clickedTome);
      setMarkdown(await GetEntryContent(firstEntry));
    } else {
      // Tome is empty – create default untitled entry
      const newEntry = await NewEntry(clickedTome, "Untitled");
      setEntries([newEntry]);
      setEntry(newEntry);
      await SelectEntry(newEntry, clickedTome);
      setMarkdown(await GetEntryContent(newEntry));
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

  const handleNewTome = async () => {
    if (archive) {
      const newTome = await NewTome(archive as Archive, "Untitled");
      setTome(newTome);
      setEntries(await OpenTome(newTome) as unknown as Entry[]);
    }
  };

  const handleNewEntry = async () => {
    if (tome) {
      const newEntry = await NewEntry(tome as Tome, "Untitled");
      setEntry(newEntry);
      setMarkdown(await GetEntryContent(newEntry));
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
    window.addEventListener("keydown", (e) => NewEntryShortcut(e, tome as Tome));
    return () => {
      window.removeEventListener("keydown", (e) => NewEntryShortcut(e, tome as Tome));
    };
  }, [tome]);

  useEffect(() => {
    window.addEventListener("keydown", (e) => NewTomeShortcut(e, archive as Archive));
    return () => {
      window.removeEventListener("keydown", (e) => NewTomeShortcut(e, archive as Archive));
    };
  }, [archive]);

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
    <StartWindow archives={archives} onArchiveClick={handleArchiveOpen} onCreateArchive={handleArchiveCreate} />
    <div className="menubar">
      <AppMenuBar onNewTome={handleNewTome} onNewEntry={handleNewEntry} onSave={handleSave} onSaveAll={handleSaveAll} onClose={handleClose} onPreferences={handlePreferences} />
    </div>
    <div className="app">
      {/* MENU BAR */}
      
      {/* LEFT PANEL */}
      <div className="side-panel" style={{ width: leftWidth }}>
        
        <div className="panel-header">
          <h1>StackScribe</h1>
        </div>
        <div  className="panel-content">
          {/* archive is set in the start window */}
          {archive && <div className="tree-view"><ArchiveTree archive={archive} tomes={tomes} onTomeClick={handleTomeClick}/></div>}
        </div>
        {/* TODO: Add footer content*/}
        <div className="panel-footer">
          <div className="panel-nav">
          {/* TODO: Add functionality to these icons */}
          <NavIconButton icon={<GearIcon/>} onClick={handlePreferences} />
          <NavIconButton icon={<FilePlusIcon/>} onClick={handleNewEntry} />
          <NavIconButton icon={<DotsHorizontalIcon/>} onClick={handleNewTome} />
          </div>
        </div>
      </div>

      {/* divider */}
      <div className="divider" style={{ width: DIVIDER_SIZE }} />

      {/* entry view that is opened when a tome is clicked */}
      {tome && <div className="entry-view-panel"><EntryView entries={entries} onEntryClick={handleEntryClick} /></div>}

      {/* DIVIDER LEFT */}
      <div
        className="divider"
        onMouseDown={() => setDragging("left")}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* EDITOR (flex 1) */}
      <div id="editor-container" 
        className="panel" 
        style={{ flex: 1 }}
      >
        <MdEditor value={markdown} onEntryChange={handleEntryChanged} />
      </div>

      {/* DIVIDER RIGHT */}
      <div
        className="divider"
        onMouseDown={() => setDragging("right")}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* PREVIEW */}
      <div
        id="preview-container"
        className="panel"
        style={{ width: rightWidth, overflow: "auto", padding: "1rem" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
    </>
  );
}

export default App;
