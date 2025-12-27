import { Tome } from "../../types/tome";
import TomeItem from "./TomeItem";
import { Entry } from "../../types/entry";

interface TomeListProps {
    tomes: Tome[];
    onTomeClick: (tome: Tome, entries: Entry[]) => void;
    onEntryClick: (entry: Entry) => void;
    onRenameEntry: (entry: Entry) => void;
    onDeleteEntry: (entry: Entry) => void;
    refreshKey?: number;
}

export default function TomeList(props: TomeListProps) {
    const { tomes, onTomeClick, onEntryClick, onRenameEntry, onDeleteEntry, refreshKey } = props;

    return (
        <div className="tome-list-inner">
            {tomes.map((tome) => (
                <TomeItem
                    key={tome.id}
                    tome={tome}
                    onTomeClick={onTomeClick}
                    onEntryClick={onEntryClick}
                    onRenameEntry={onRenameEntry}
                    onDeleteEntry={onDeleteEntry}
                    refreshKey={refreshKey}
                />
            ))}
        </div>
    );
}
