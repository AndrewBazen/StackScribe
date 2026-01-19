import { useState, useEffect, useCallback } from "react";

type DragTarget = null | "left" | "preview" | "chat";

interface PanelLayoutState {
  leftWidth: number;
  previewWidth: number;
  chatWidth: number;
  panelsVisible: boolean;    // Left sidebar toggle
  previewVisible: boolean;   // Preview panel toggle
  chatVisible: boolean;      // Chat panel toggle
  dragging: DragTarget;
}

interface PanelLayoutActions {
  setLeftWidth: (width: number) => void;
  setPreviewWidth: (width: number) => void;
  setChatWidth: (width: number) => void;
  togglePanels: () => void;
  togglePreview: () => void;
  toggleChat: () => void;
  startDragging: (target: DragTarget) => void;
}

const MIN_PANEL_WIDTH = 200;
const MIN_EDITOR_WIDTH = 300;

export function usePanelLayout(
  initialLeftWidth = 200,
  initialPreviewWidth = 350,
  initialChatWidth = 350
): PanelLayoutState & PanelLayoutActions {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [previewWidth, setPreviewWidth] = useState(initialPreviewWidth);
  const [chatWidth, setChatWidth] = useState(initialChatWidth);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [chatVisible, setChatVisible] = useState(false);

  const togglePanels = useCallback(() => {
    setPanelsVisible(prev => !prev);
  }, []);

  const togglePreview = useCallback(() => {
    setPreviewVisible(prev => !prev);
  }, []);

  const toggleChat = useCallback(() => {
    setChatVisible(prev => !prev);
  }, []);

  const startDragging = useCallback((target: DragTarget) => {
    setDragging(target);
  }, []);

  // Handle panel resizing via mouse drag
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (dragging === "left") {
        // Calculate max width for left panel
        // Leave room for editor + any visible right panels
        const rightPanelsWidth =
          (previewVisible ? previewWidth : 0) +
          (chatVisible ? chatWidth : 0);
        const maxLeftWidth = window.innerWidth - rightPanelsWidth - MIN_EDITOR_WIDTH;
        setLeftWidth(Math.min(Math.max(e.clientX, MIN_PANEL_WIDTH), maxLeftWidth));
      } else if (dragging === "preview") {
        // Preview divider: between editor and preview panel
        // Calculate the position of the preview panel's left edge
        const leftPanelWidth = panelsVisible ? leftWidth : 0;
        const previewLeftEdge = e.clientX;

        // Calculate new preview width based on cursor position
        // Preview width = distance from cursor to where chat starts (or window edge)
        const chatStart = chatVisible
          ? window.innerWidth - chatWidth
          : window.innerWidth;
        const newPreviewWidth = chatStart - previewLeftEdge;

        // Ensure minimum widths
        const editorWidth = previewLeftEdge - leftPanelWidth;
        if (editorWidth >= MIN_EDITOR_WIDTH && newPreviewWidth >= MIN_PANEL_WIDTH) {
          setPreviewWidth(newPreviewWidth);
        }
      } else if (dragging === "chat") {
        // Chat divider: between preview (or editor if preview hidden) and chat panel
        const newChatWidth = window.innerWidth - e.clientX;

        // Calculate available space
        const leftPanelWidth = panelsVisible ? leftWidth : 0;
        const previewPanelWidth = previewVisible ? previewWidth : 0;
        const minSpaceNeeded = leftPanelWidth + MIN_EDITOR_WIDTH + previewPanelWidth;
        const maxChatWidth = window.innerWidth - minSpaceNeeded;

        if (newChatWidth >= MIN_PANEL_WIDTH && newChatWidth <= maxChatWidth) {
          setChatWidth(newChatWidth);
        }
      }
    };

    const stopDragging = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [dragging, leftWidth, previewWidth, chatWidth, panelsVisible, previewVisible, chatVisible]);

  return {
    leftWidth,
    previewWidth,
    chatWidth,
    panelsVisible,
    previewVisible,
    chatVisible,
    dragging,
    setLeftWidth,
    setPreviewWidth,
    setChatWidth,
    togglePanels,
    togglePreview,
    toggleChat,
    startDragging,
  };
}
