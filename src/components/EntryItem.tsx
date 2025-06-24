
import { Entry } from "../types/entry";

interface EntryItemProps {
    entry: Entry;
    onEntryClick: (entry: Entry) => void;
}

export default function EntryItem(props: EntryItemProps) {
    const { entry, onEntryClick } = props;

    return (
        <div className="entry-item" onClick={() => onEntryClick(entry)}>
            <div className="entry-item-title">{entry.name}</div>
            <div className="entry-item-content-preview">{entry.content.slice(0, 50)}...</div>
        </div>
    );
}