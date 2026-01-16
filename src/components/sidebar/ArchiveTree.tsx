import { useState } from "react";
import TomeList from "./TomeList";
import TreeHeader from "./TreeHeader";
import { Tome } from "../../types/tome";
import { Archive } from "../../types/archive";
import { Entry } from "../../types/entry";

interface ArchiveTreeProps {
    archive: Archive;
    tomes: Tome[];
    onTomeClick: (tome: Tome, entries: Entry[]) => void;
    onEntryClick: (entry: Entry) => void;
    onRenameEntry: (entry: Entry) => void;
    onDeleteEntry: (entry: Entry) => void;
    refreshKey?: number;
    selectedTomeId?: string | null;
    selectedEntryId?: string | null;
}

export default function ArchiveTree(props: ArchiveTreeProps) {
    const { archive, tomes, onTomeClick, onEntryClick, onRenameEntry, onDeleteEntry, refreshKey, selectedTomeId, selectedEntryId } = props;
    const [isExpanded, setIsExpanded] = useState(true);

    const handleBackClick = () => {
        setIsExpanded(!isExpanded);
    };

    const handleTomeClick = (tome: Tome, entries: Entry[]) => {
        onTomeClick(tome, entries);
    };

    return (
        <div className="tree-view-inner">
            <TreeHeader title={archive.name} onBackClick={handleBackClick} isExpanded={isExpanded} />
            {isExpanded && (
                <TomeList
                    tomes={tomes}
                    onTomeClick={handleTomeClick}
                    onEntryClick={onEntryClick}
                    onRenameEntry={onRenameEntry}
                    onDeleteEntry={onDeleteEntry}
                    refreshKey={refreshKey}
                    selectedTomeId={selectedTomeId}
                    selectedEntryId={selectedEntryId}
                />
            )}
        </div>
    );
}
