import React, { useRef, useState } from "react";
import { Entry } from "../types/entry";

interface Props {
  tabs: Entry[];
  activeTabId: string | null;
  dirtyIds?: string[];
  onSelect(id: string): void;
  onClose(id: string): void;
  onReorder(dragId: string, targetId: string): void;
}

export default function TabBar({
  tabs,
  activeTabId,
  dirtyIds = [],
  onSelect,
  onClose,
  onReorder,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const startDrag = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingId(id);

    const move = (ev: MouseEvent) => {
      const bar = barRef.current;
      if (!bar) return;
      const { left } = bar.getBoundingClientRect();
      const x = ev.clientX - left;

      // figure out which tab we are over
      let target: string | null = null;
      for (const child of Array.from(bar.children) as HTMLDivElement[]) {
        const rect = child.getBoundingClientRect();
        if (x >= rect.left - left && x < rect.right - left) {
          target = child.dataset.id ?? null;
          break;
        }
      }
      setDragOverId(target);
      dragOverIdRef.current = target;
    };

    const end = (ev: MouseEvent) => {
      const bar = barRef.current;
      let dropTarget = dragOverIdRef.current;
      if (bar) {
        const { left } = bar.getBoundingClientRect();
        const x = ev.clientX - left;
        for (const child of Array.from(bar.children) as HTMLDivElement[]) {
          const rect = child.getBoundingClientRect();
          if (x >= rect.left - left && x < rect.right - left) {
            dropTarget = child.dataset.id ?? dropTarget;
            break;
          }
        }
      }
      if (id && dropTarget && id !== dropTarget) {
        onReorder(id, dropTarget);
      }
      setDraggingId(null);
      setDragOverId(null);
      dragOverIdRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
  };

  return (
    <div ref={barRef} className="tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isDirty = dirtyIds.includes(tab.id);
        const isDragOver = dragOverId === tab.id && draggingId !== tab.id;

        return (
          <div
            key={tab.id}
            data-id={tab.id}
            className={`tab ${isActive ? "active" : ""} ${
              isDragOver ? "drag-over" : ""
            } ${draggingId === tab.id ? "dragging" : ""}`}
            onMouseDown={startDrag(tab.id)}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab-title">{tab.name}</span>
            {isDirty && <span className="unsaved-dot" />}
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ✕
            </span>
          </div>
        );
      })}
    </div>
  );
}