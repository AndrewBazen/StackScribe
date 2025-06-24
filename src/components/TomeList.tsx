
import { Tome } from "../types/tome";
import TomeItem from "./TomeItem";

interface TomeListProps {
    tomes: Tome[];
    onTomeClick: (tome: Tome) => void;
}
export default function TomeList(props: TomeListProps) {
    const { tomes, onTomeClick } = props;

    return (
        <div className="tome-list-inner">
            {tomes.map((tome) => (
                <TomeItem key={tome.name} tome={tome} onTomeClick={onTomeClick} isExpanded={false} />
                
            ))}
        </div>
    );
}