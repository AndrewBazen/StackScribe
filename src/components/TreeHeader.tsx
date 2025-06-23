interface TreeHeaderProps {
    title: string;
    onBackClick: () => void;
    isExpanded: boolean;
}

export default function TreeHeader(props: TreeHeaderProps) {
    const { title, onBackClick, isExpanded } = props;
    return (
        <div className="tree-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="tree-header-expand" onClick={onBackClick}>
                <i className={`fa-solid ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"}`}></i>
            </div>
            <h1 style={{ margin: 0, padding: 0, fontSize: "1.5rem", fontWeight: "bold" }}>{title}</h1>
        </div>
    );
}