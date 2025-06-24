import { useState } from "react";
import TomeList from "./TomeList";
import TreeHeader from "./TreeHeader";
import { Tome } from "../types/tome";
import { Archive } from "../types/archive";

interface ArchiveTreeProps {
    archive: Archive;
    tomes: Tome[];
    onTomeClick: (tome: Tome) => void;
}

export default function ArchiveTree(props: ArchiveTreeProps) {
    const { archive, tomes, onTomeClick } = props;
    const [isExpanded, setIsExpanded] = useState(true);
    const handleBackClick = () => {
        setIsExpanded(!isExpanded);
    };
    const handleTomeClick = (tome: Tome) => {
        onTomeClick(tome);
    };

    return (
        <div className="tree-view-inner">
            <TreeHeader title={archive.name} onBackClick={handleBackClick} isExpanded={isExpanded} />
            {isExpanded && <TomeList tomes={tomes} onTomeClick={handleTomeClick} />}
        </div>
    );
}

