import { Entry } from "../../types/entry";
import * as ContextMenu from "@radix-ui/react-context-menu";

interface TreeEntryItemProps {
    entry: Entry;
    onEntryClick: (entry: Entry) => void;
    onRename: (entry: Entry) => void;
    onDelete: (entry: Entry) => void;
    isSelected?: boolean;
}

export default function TreeEntryItem(props: TreeEntryItemProps) {
    const { entry, onEntryClick, onRename, onDelete, isSelected = false } = props;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEntryClick(entry);
        }
    };

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>
                <div
                    className={`tree-entry-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => onEntryClick(entry)}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                >
                    <span className="tree-entry-item-name">{entry.name}</span>
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
