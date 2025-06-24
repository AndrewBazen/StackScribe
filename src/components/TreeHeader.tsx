import { ChevronDownIcon } from "@radix-ui/react-icons";

interface TreeHeaderProps {
    title: string;
    onBackClick: () => void;
    isExpanded: boolean;
}

export default function TreeHeader(props: TreeHeaderProps) {
    const { title, onBackClick, isExpanded } = props;
    return (
        <div className="tree-view-inner-item">
            <div className="tree-view-inner-item-expand" onClick={onBackClick}>
                <ChevronDownIcon className={`${isExpanded ? "rotate-90" : ""}`}/>
            </div>
            <h1 className="tree-view-inner-item-title">{title}</h1>
        </div>
    );
}