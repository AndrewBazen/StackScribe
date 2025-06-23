import { Entry } from "../types/entry";
import EntryList from "./EntryList";

interface EntryViewProps {
    entries: Entry[];
    onEntryClick: (entry: Entry) => void;
}

export default function EntryView(props: EntryViewProps) {
    const { entries, onEntryClick } = props;
    return (
        <div>
            <EntryList entries={entries} onEntryClick={onEntryClick} />
        </div>
    );
}