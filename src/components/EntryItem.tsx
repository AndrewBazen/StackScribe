import { useState, useRef, FormEvent } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as Popover from "@radix-ui/react-popover";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Entry } from "../types/entry";
import "../Styles/App.css";

type Mode = "rename" | "delete" | null;

export default function EntryItem({
  entry,
  onEntryClick,
  onRename,
  onDelete,
}: {
  entry: Entry;
  onEntryClick: (e: Entry) => void;
  onRename: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [draftName, setDraftName] = useState(entry.name);

  /* helpers */
  const close = () => setMode(null);

  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== entry.name) onRename({ ...entry, name: trimmed });
    close();
  };

  const confirmDelete = () => {
    onDelete(entry);
    close();
  };

  return (
    <>
      {/* ---------- ENTRY ROW + CONTEXT MENU ---------- */}
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            ref={triggerRef}
            className="entry-item"
            tabIndex={0}
            onClick={(e) => {
                onEntryClick(entry);
            }}
          >
            <div className="entry-item-title">{entry.name}</div>
            <div className="entry-item-content-preview">
              Modified: {entry.updated_at.slice(0, 10)}
            </div>
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content className="context-menu">
            <ContextMenu.Item
              onSelect={() => {
                setTimeout(() => {
                  setDraftName(entry.name);
                  setMode("rename");
                }, 0);
              }}
            >
              Rename
            </ContextMenu.Item>
            <ContextMenu.Item onSelect={() => {
                setTimeout(() => {
                    setMode("delete");
                }, 0);
            }}>
              Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {/* ---------- SINGLE POPOVER ---------- */}
      <Popover.Root open={mode !== null}
        onOpenChange={(open) => {
            if (!open) setMode(null);          // close popover on outside click/Esc
        }}
      >
        <Popover.Anchor asChild>
            <div ref={triggerRef} />
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            side="right"
            sideOffset={8}
            align="start"
            className="popover-content"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                close();
              }
            }}
          >
            {mode === "rename" && (
              <form onSubmit={submitRename} className="popover-form">
                <input
                  className="input"
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submitRename(e);
                    }
                  }}
                  autoFocus
                  required
                  minLength={1}
                  maxLength={255}
                  style={{ margin: 0}}
                />
              </form>
            )}

            {mode === "delete" && (
              <>
                <div style={{ marginBottom: 8, maxWidth: 200 }}>
                  Delete “<strong>{entry.name}</strong>”?<br />
                  <small>This action cannot be undone.</small>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="primary-button destructive"
                    onClick={confirmDelete}
                  >
                    Delete
                  </button>
                  <Popover.Close asChild>
                    <button className="popover-close-button" aria-label="Cancel" onClick={close}>
                      <Cross2Icon />
                    </button>
                  </Popover.Close>
                </div>
              </>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
