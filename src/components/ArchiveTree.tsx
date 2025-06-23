import { useState } from "react";
import { Archive } from "../types/archive";
import TomeList from "./TomeList";
import TreeHeader from "./TreeHeader";
import { Tome } from "../types/tome";

interface ArchiveTreeProps {
    archive: Archive;
    onTomeClick: (tome: Tome) => void;
}

export default function ArchiveTree(props: ArchiveTreeProps) {
    const { archive, onTomeClick } = props;
    const [isExpanded, setIsExpanded] = useState(true);
    const handleBackClick = () => {
        setIsExpanded(!isExpanded);
    };
    const handleTomeClick = (tome: Tome) => {
        onTomeClick(tome);
    };

    return (
        <div className="archive-tree">
            <TreeHeader title={archive.name} onBackClick={handleBackClick} isExpanded={isExpanded} />
            {isExpanded && <TomeList tomes={archive.tomes} onTomeClick={handleTomeClick} />}
        </div>
    );
}

