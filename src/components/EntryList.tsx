import { Entry } from "../types/entry";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import EntryItem from "./EntryItem";

interface EntryListProps {
    entries: Entry[];
    onEntryClick: (entry: Entry) => void;
    onRename: (entry: Entry) => void;
    onDelete: (entry: Entry) => void;
}

export default function EntryList(props: EntryListProps) {
    const { entries, onEntryClick, onRename, onDelete } = props;
  return (
    <ScrollArea.Root className="entry-list">
      <ScrollArea.Viewport className="entry-list-viewport">
        {entries.map((e) => (
          <EntryItem
            key={e.id}
            entry={e}
            onEntryClick={onEntryClick}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
}