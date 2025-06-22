import "./App.css";
import { MdEditor } from "./components/MpEditor";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NavIconButton } from "./components/NavIconButton";
import StackScribeIcon from "../src-tauri/icons/SSlogo.svg?react";

const DIVIDER_SIZE = 6; // px

type DragTarget = null | "left" | "right";

function App() {
  const [leftWidth, setLeftWidth] = useState(250);   // side panel
  const [rightWidth, setRightWidth] = useState(300); // preview panel
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [markdown, setMarkdown] = useState("# Hello, World!\n\n*Write some markdown...*");

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
    <div className="app" style={{ height: "100vh" }}>
      {/* LEFT PANEL */}
      <div className="side-panel" style={{ width: leftWidth }}>
        <div className="side-panel-nav">
        <NavIconButton icon={<StackScribeIcon />} onClick={() => {}} />
        <NavIconButton icon={<StackScribeIcon />} onClick={() => {}} />
        </div>
        <div className="side-panel-header">
          <h1>Side Panel</h1>
        </div>
      </div>

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
  );
}

export default App;
