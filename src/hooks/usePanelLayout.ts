import { useState, useEffect, useCallback } from "react";

type DragTarget = null | "left" | "right";
export type RightPanelMode = "preview" | "chat";

interface PanelLayoutState {
  leftWidth: number;
  rightWidth: number;
  panelsVisible: boolean;
  dragging: DragTarget;
  rightPanelMode: RightPanelMode;
}

interface PanelLayoutActions {
  setLeftWidth: (width: number) => void;
  setRightWidth: (width: number) => void;
  togglePanels: () => void;
  startDragging: (target: DragTarget) => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  toggleRightPanelMode: () => void;
}

export function usePanelLayout(
  initialLeftWidth = 200,
  initialRightWidth = 300
): PanelLayoutState & PanelLayoutActions {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("preview");

  const togglePanels = useCallback(() => {
    setPanelsVisible(prev => !prev);
  }, []);

  const startDragging = useCallback((target: DragTarget) => {
    setDragging(target);
  }, []);

  const toggleRightPanelMode = useCallback(() => {
    setRightPanelMode(prev => prev === "preview" ? "chat" : "preview");
  }, []);

  // Handle panel resizing via mouse drag
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (dragging === "left") {
        setLeftWidth(Math.min(Math.max(e.clientX, 150), window.innerWidth - rightWidth - 200));
      } else if (dragging === "right") {
        const newRight = Math.min(Math.max(window.innerWidth - e.clientX, 150), window.innerWidth - leftWidth - 200);
        setRightWidth(newRight);
      }
    };

    const stopDragging = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [dragging, leftWidth, rightWidth]);

  return {
    leftWidth,
    rightWidth,
    panelsVisible,
    dragging,
    rightPanelMode,
    setLeftWidth,
    setRightWidth,
    togglePanels,
    startDragging,
    setRightPanelMode,
    toggleRightPanelMode,
  };
}
