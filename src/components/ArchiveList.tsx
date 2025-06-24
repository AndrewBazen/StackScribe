import { Archive } from "../types/archive";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface ArchiveListProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
}

export default function ArchiveList(props: ArchiveListProps) {
    const { archives, onArchiveClick } = props;
    return (
        <ScrollArea.Root className="list">
            <ScrollArea.Viewport className="list-viewport">
                {archives.map((archive) => (
                    <div key={archive.name} onClick={() => onArchiveClick(archive)} className="list-item">
                        {archive.name}
                    </div>
                ))}
            </ScrollArea.Viewport>
        </ScrollArea.Root>
    );
}