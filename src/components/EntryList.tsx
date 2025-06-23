import { Entry } from "../types/entry";

interface EntryListProps {
    entries: Entry[];
    onEntryClick: (entry: Entry) => void;
}

export default function EntryList(props: EntryListProps) {
    const { entries, onEntryClick } = props;
    return (
        <ul>
            {entries.map((entry) => (
                <li key={entry.name} onClick={() => onEntryClick(entry)}>{entry.name}</li>
            ))}
        </ul>
    );
}