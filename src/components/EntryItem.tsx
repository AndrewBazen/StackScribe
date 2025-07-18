
import { Entry } from "../types/entry";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useRef, useCallback } from "react";

interface EntryItemProps {
    entry: Entry;
    onEntryClick: (entry: Entry) => void;
    onRename: (entry: Entry) => void;
    onDelete: (entry: Entry) => void;
}

export default function EntryItem(props: EntryItemProps) {
    const { entry, onEntryClick, onRename, onDelete } = props;
    const triggerRef = useRef<HTMLDivElement>(null);
    
    const handleRename = useCallback(() => {
        onRename(entry);
    }, [entry, onRename]);

    const handleDelete = useCallback(() => {
        onDelete(entry);
    }, [entry, onDelete]);

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div
                    ref={triggerRef}
                    className="entry-item"
                    onClick={() => {
                        onEntryClick(entry);
                    }}
                >
                    <div className="entry-item-title">{entry.name}</div>
                    <div className="entry-item-content-preview">
                        {entry.content.slice(0, 10)}…
                    </div>
                </div>
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
                <ContextMenu.Content 
                    className="context-menu"
                    onCloseAutoFocus={() => {
                        if (triggerRef.current) {
                            triggerRef.current.focus();
                        }
                    }}
                    onEscapeKeyDown={() => {
                        if (triggerRef.current) {
                            triggerRef.current.focus(); 
                        }
                    }}
                >
                    <ContextMenu.Item onSelect={handleRename}>
                        Rename
                    </ContextMenu.Item>
                    <ContextMenu.Item onSelect={handleDelete}>
                        Delete
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    );
}