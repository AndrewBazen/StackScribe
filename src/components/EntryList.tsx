import { Entry } from "../types/entry";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import EntryItem from "./EntryItem";

interface EntryListProps {
    entries: Entry[];
    onEntryClick: (entry: Entry) => void;
}

export default function EntryList(props: EntryListProps) {
    const { entries, onEntryClick } = props;
    return (
        <ScrollArea.Root className="entry-list">
            <ScrollArea.Viewport className="entry-list-viewport">
                {entries.map((entry) => (
                    <EntryItem key={entry.id} entry={entry} onEntryClick={onEntryClick} />
                ))}
            </ScrollArea.Viewport>
        </ScrollArea.Root>
    );
}