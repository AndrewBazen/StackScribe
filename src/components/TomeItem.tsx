
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Tome } from "../types/tome";
import { getEntriesByTomeId } from "../stores/dataStore";
import { Entry } from "../types/entry";

interface TomeItemProps {
    tome: Tome;
    onTomeClick: (tome: Tome, entries: Entry[]) => void;
    isExpanded: boolean;
}

export default function TomeItem(props: TomeItemProps) {
    const { tome, onTomeClick, isExpanded } = props;

    const handleTomeClick = async () => {
        // gets the entries that are in the selected tome
        // and then sends them to the entry view
        const entries = await getEntriesByTomeId(tome.id);
        onTomeClick(tome, entries);
    };

    return (
        <div className="tome-item" onClick={handleTomeClick}>
            <div className="tome-item-expand" onClick={handleTomeClick}>
                <ChevronDownIcon className={`${isExpanded ? "rotate-90" : ""}`}/>
            </div>
            <div className="tome-item-title">{tome.name}</div>
        </div>
    );
}