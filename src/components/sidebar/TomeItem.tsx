import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Tome } from "../../types/tome";
import { Entry } from "../../types/entry";
import { getEntriesByTomeId } from "../../stores/dataStore";
import TreeEntryItem from "./TreeEntryItem";

interface TomeItemProps {
    tome: Tome;
    onTomeClick: (tome: Tome, entries: Entry[]) => void;
    onEntryClick: (entry: Entry) => void;
    onRenameEntry: (entry: Entry) => void;
    onDeleteEntry: (entry: Entry) => void;
    refreshKey?: number;
    isSelected?: boolean;
    selectedEntryId?: string | null;
}

export default function TomeItem(props: TomeItemProps) {
    const { tome, onTomeClick, onEntryClick, onRenameEntry, onDeleteEntry, refreshKey, isSelected = false, selectedEntryId } = props;
    const [isExpanded, setIsExpanded] = useState(false);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    const fetchEntries = async () => {
        const fetchedEntries = await getEntriesByTomeId(tome.id);
        setEntries(fetchedEntries);
        setHasLoaded(true);
        return fetchedEntries;
    };

    const handleToggleExpand = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();

        if (!hasLoaded) {
            await fetchEntries();
        }

        setIsExpanded(!isExpanded);
    };

    const handleTomeNameClick = async () => {
        let currentEntries = entries;
        if (!hasLoaded) {
            currentEntries = await fetchEntries();
        }
        onTomeClick(tome, currentEntries);
        if (!isExpanded) {
            setIsExpanded(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTomeNameClick();
        }
    };

    const handleExpandKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleExpand(e);
        }
    };

    // Refresh entries when refreshKey changes
    useEffect(() => {
        if (hasLoaded && isExpanded) {
            fetchEntries();
        }
    }, [refreshKey]);

    return (
        <div className="tome-item-container">
            <div className={`tome-item ${isSelected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''}`}>
                <div
                    className={`tome-item-expand ${isExpanded ? 'expanded' : ''}`}
                    onClick={handleToggleExpand}
                    onKeyDown={handleExpandKeyDown}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </div>
                <div
                    className="tome-item-title"
                    onClick={handleTomeNameClick}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="button"
                >
                    {tome.name}
                </div>
            </div>

            {isExpanded && (
                <div className="tome-entries">
                    {entries.map((entry) => (
                        <TreeEntryItem
                            key={entry.id}
                            entry={entry}
                            onEntryClick={onEntryClick}
                            onRename={onRenameEntry}
                            onDelete={onDeleteEntry}
                            isSelected={selectedEntryId === entry.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
