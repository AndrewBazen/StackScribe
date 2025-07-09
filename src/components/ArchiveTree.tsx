import { useState } from "react";
import TomeList from "./TomeList";
import TreeHeader from "./TreeHeader";
import { Tome } from "../types/tome";
import { Archive } from "../types/archive";
import { Entry } from "../types/entry";

interface ArchiveTreeProps {
    archive: Archive;
    tomes: Tome[];
    onTomeClick: (tome: Tome, entries: Entry[]) => void;
}

export default function ArchiveTree(props: ArchiveTreeProps) {
    const { archive, tomes, onTomeClick } = props;
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
            {isExpanded && <TomeList tomes={tomes} onTomeClick={handleTomeClick} />}
        </div>
    );
}

