
import { Entry } from "../types/entry";
import * as ContextMenu from "@radix-ui/react-context-menu";

interface EntryItemProps {
    entry: Entry;
    onEntryClick: (entry: Entry) => void;
    onRename: (entry: Entry) => void;
    onDelete: (entry: Entry) => void;
}

export default function EntryItem(props: EntryItemProps) {
    const { entry, onEntryClick, onRename, onDelete } = props;
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div
                    className="entry-item"
                    onClick={() => onEntryClick(entry)}
                >
                    <div className="entry-item-title">{entry.name}</div>
                    <div className="entry-item-content-preview">
                        {entry.content.slice(0, 10)}…
                    </div>
                </div>
            </ContextMenu.Trigger>

            <ContextMenu.Content className="context-menu">
                <ContextMenu.Item onSelect={() => onRename(entry)}>
                    Rename
                </ContextMenu.Item>
                <ContextMenu.Item onSelect={() => onDelete(entry)}>
                    Delete
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Root>
    );
}