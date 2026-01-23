import { Archive } from "../../types/archive";
import ArchiveSelect from "./ArchiveSelect";
import * as Dialog from "@radix-ui/react-dialog";
import logo from "../../../src-tauri/icons/icon.png";
import LoadingOverlay from "../ui/LoadingOverlay";

export default function StartWindow(props: {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive, tomeName: string) => void;
    isReady: boolean;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { archives, onArchiveClick, onCreateArchive, isReady, isOpen, onOpenChange } = props;

    const handleArchiveClick = (archive: Archive) => {
        if (!isReady) {
            console.warn('⚠️ Cannot open archive while app is initializing');
            return;
        }
        onArchiveClick(archive);
        onOpenChange(false);
    };

    const handleCreateArchive = (archive: Archive, tomeName: string) => {
        if (!isReady) {
            console.warn('⚠️ Cannot create archive while app is initializing');
            return;
        }
        onCreateArchive(archive, tomeName);
        onOpenChange(false);
    };

    // Show a full-screen loading overlay until the app is ready
    if (!isReady) {
        return <LoadingOverlay message="Initializing..." />;
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => { if (open) onOpenChange(open); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content" >
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
                            isReady={isReady}
                        />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
