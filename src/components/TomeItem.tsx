
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Tome } from "../types/tome";

interface TomeItemProps {
    tome: Tome;
    onTomeClick: (tome: Tome) => void;
    isExpanded: boolean;
}

export default function TomeItem(props: TomeItemProps) {
    const { tome, onTomeClick, isExpanded } = props;

    const handleTomeClick = () => {
        // gets the entries that are in the selected tome
        // and then sends them to the entry view
        onTomeClick(tome);
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