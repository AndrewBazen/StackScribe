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
import { invoke } from "@tauri-apps/api/core";
import { DotsHorizontalIcon, FilePlusIcon, GearIcon } from "@radix-ui/react-icons";

const DIVIDER_SIZE = 6; // px

type DragTarget = null | "left" | "right";

function App() {
  const [leftWidth, setLeftWidth] = useState(250);   // side panel
  const [rightWidth, setRightWidth] = useState(300); // preview panel
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [markdown, setMarkdown] = useState("# Hello, World!\n\n*Write some markdown...*");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tome, setTome] = useState<Tome | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [archive, setArchive] = useState<Archive | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);

  useEffect(() => {
    const getArchives = async () => {
      const archives = await invoke("get_archives");
      setArchives(archives as unknown as Archive[]);
    };
    getArchives();
  }, []);
  
  const handleEntryClick = (entry: Entry) => {
    setEntry(entry);
  };

  const handleTomeClick = (tome: Tome) => {
    setTome(tome);
  };

  useEffect(() => {
    if (entry) {
      setMarkdown(entry.content);
      setEntry(null);
    }
  }, [entry]);

  useEffect(() => {
    if (tome) {
      setEntries(tome.entries);
      setEntry(tome.entries[0]);
    }
  }, [tome]);

  useEffect(() => {
    const getTome = async () => {
      if (archive) {
        if (archive.tomes.length > 0) {
          setTome(archive.tomes[0]);
        } else {
          const tome = await invoke("create_tome", { archive: archive, tomeName: "New Tome" });
          setTome(tome as unknown as Tome);
        }
      } else {
        console.log("No archive selected");
      }
    };
    getTome();
  }, [archive]);

  useEffect(() => {
    const getEntry = async () => {
    if (tome) {
      if (tome.entries.length > 0) {
        setEntries(tome.entries);
        setEntry(tome.entries[0]);
      } else {
        const entry = await invoke("create_entry", { entryName: "New Entry", tome: tome });
          setEntry(entry as unknown as Entry);
        }
      }
    };
    getEntry();
  }, [tome]);

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
    <StartWindow archives={archives} onArchiveClick={setArchive} onCreateArchive={setArchive} />
    <div className="app" style={{ height: "100vh" }}>
      {/* LEFT PANEL */}
      <div className="side-panel" style={{ width: leftWidth }}>
        
        <div className="side-panel-header">
          <h1>StackScribe</h1>
        </div>
        <div className="side-panel-content">
          {/* archive is set in the start window */}
          {archive && <ArchiveTree archive={archive} onTomeClick={handleTomeClick}/>}
        </div>
        {/* TODO: Add footer content*/}
        <div className="side-panel-footer">
          <div className="side-panel-nav">
          {/* TODO: Add functionality to these icons */}
          <NavIconButton icon={<GearIcon/>} onClick={() => {}} />
          <NavIconButton icon={<FilePlusIcon/>} onClick={() => {}} />
          <NavIconButton icon={<DotsHorizontalIcon/>} onClick={() => {}} />
          </div>
        </div>
      </div>

      {/* entry view that is opened when a tome is clicked */}
      {tome && <EntryView entries={entries} onEntryClick={handleEntryClick} />}

      {/* DIVIDER LEFT */}
      <div
        className="divider"
        onMouseDown={() => setDragging("left")}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* EDITOR (flex 1) */}
      <div className="editor-container" style={{ flex: 1 }}>
        <MdEditor value={markdown} setValue={setMarkdown} />
      </div>

      {/* DIVIDER RIGHT */}
      <div
        className="divider"
        onMouseDown={() => setDragging("right")}
        style={{ width: DIVIDER_SIZE }}
      />

      {/* PREVIEW */}
      <div
        className="preview-container"
        style={{ width: rightWidth, overflow: "auto", padding: "1rem" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
    </>
  );
}

export default App;
