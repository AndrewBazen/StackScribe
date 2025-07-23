import { useState } from "react";
import { Archive } from "../types/archive";
import ArchiveSelect from "./ArchiveSelect";
import * as Dialog from "@radix-ui/react-dialog";
import logo from "../../src-tauri/icons/icon.png";
import { SyncStatus } from "../lib/sync";
import LoadingOverlay from "./LoadingOverlay";

export default function StartWindow(props: {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive, tomeName: string) => void;
    syncStatus: SyncStatus;
}) {
    const { archives, onArchiveClick, onCreateArchive, syncStatus } = props;
    const [isOpen, setIsOpen] = useState(true);

    const handleArchiveClick = (archive: Archive) => {
        if (!syncStatus.isReady) {
            console.warn('⚠️ Cannot open archive while sync is in progress');
            return;
        }
        onArchiveClick(archive);
        setIsOpen(false);
    };

    const handleCreateArchive = (archive: Archive, tomeName: string) => {
        if (!syncStatus.isReady) {
            console.warn('⚠️ Cannot create archive while sync is in progress');
            return;
        }
        onCreateArchive(archive, tomeName);
        setIsOpen(false);
    };

    const getSyncStatusMessage = () => {
        if (syncStatus.isInitializing) {
            return "Initializing and syncing data...";
        }
        if (syncStatus.isSyncing) {
            return "🔄 Syncing data...";
        }
        if (syncStatus.error) {
            return `⚠️ Sync error: ${syncStatus.error} (working offline)`;
        }
        if (syncStatus.isReady) {
            return "✅ Ready";
        }
        return "⏳ Preparing...";
    };

    // Show a full-screen loading overlay until the app is ready
    if (!syncStatus.isReady) {
        return <LoadingOverlay message={getSyncStatusMessage()} />;
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen} modal={true}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content" onInteractOutside={(e) => e.preventDefault()}>
                    <div className="dialog-header">
                        <img src={logo} alt="StackScribe Logo" className="dialog-logo" width={100} height={100}/>
                        <Dialog.Title className="dialog-title">Welcome to StackScribe!</Dialog.Title>
                    </div>
                    <Dialog.Description className="dialog-description">
                        StackScribe is a simple note-taking app that allows you to create and manage your notes in a tree-like structure.
                    </Dialog.Description>
                    <Dialog.Description className="dialog-description">
                        Select an archive to get started, or create a new one.
                    </Dialog.Description>
                    <div className="dialog-content-inner">
                        <ArchiveSelect
                            archives={archives}
                            onArchiveClick={handleArchiveClick}
                            onCreateArchive={handleCreateArchive}
                            syncStatus={syncStatus}
                        />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}