import { Archive } from "../../types/archive";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { SyncStatus } from "../../lib/sync";

interface ArchiveListProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    syncStatus: SyncStatus;
}

export default function ArchiveList(props: ArchiveListProps) {
    const { archives, onArchiveClick, syncStatus } = props;
    
    const handleArchiveClick = (archive: Archive) => {
        if (!syncStatus.isReady) {
            console.warn('⚠️ Cannot open archive while sync is in progress');
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
                            opacity: syncStatus.isReady ? 1 : 0.5,
                            cursor: syncStatus.isReady ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {archive.name}
                    </div>
                ))}
            </ScrollArea.Viewport>
        </ScrollArea.Root>
    );
}