import { Archive } from "../../types/archive";
import * as ScrollArea from "@radix-ui/react-scroll-area";

interface ArchiveListProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    isReady: boolean;
}

export default function ArchiveList(props: ArchiveListProps) {
    const { archives, onArchiveClick, isReady } = props;

    const handleArchiveClick = (archive: Archive) => {
        if (!isReady) {
            console.warn('⚠️ Cannot open archive while app is initializing');
            return;
        }
        onArchiveClick(archive);
    };

    return (
        <ScrollArea.Root className="list">
            <ScrollArea.Viewport className="list-viewport">
                {archives.map((archive) => (
                    <div
                        key={archive.id}
                        onClick={() => handleArchiveClick(archive)}
                        className="list-item"
                        style={{
                            opacity: isReady ? 1 : 0.5,
                            cursor: isReady ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {archive.name}
                    </div>
                ))}
            </ScrollArea.Viewport>
        </ScrollArea.Root>
    );
}
