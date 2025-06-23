
import { Tome } from "../types/tome";

interface TomeItemProps {
    tome: Tome;
    onTomeClick: (tome: Tome) => void;
}

export default function TomeItem(props: TomeItemProps) {
    const { tome, onTomeClick } = props;

    const handleTomeClick = () => {
        // gets the entries that are in the selected tome
        // and then sends them to the entry view
        onTomeClick(tome);
    };

    return (
        <div className="tome-item" onClick={handleTomeClick}>
            {tome.name}
        </div>
    );
}