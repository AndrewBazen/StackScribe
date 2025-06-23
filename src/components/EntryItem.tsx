import { Entry } from "../types/entry";

interface EntryItemProps {
    entry: Entry;
    onEntryClick: (entry: Entry) => void;
}

export default function EntryItem(props: EntryItemProps) {
    const { entry, onEntryClick } = props;
    return (
        <li onClick={() => onEntryClick(entry)}>{entry.name}</li>
    );
}