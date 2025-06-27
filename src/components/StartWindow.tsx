import { useState } from "react";
import { Archive } from "../types/archive";
import ArchiveSelect from "./ArchiveSelect";
import * as Dialog from "@radix-ui/react-dialog";
import logo from "../../src-tauri/icons/icon.png";

export default function StartWindow(props: {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive) => void;
}) {
    const { archives, onArchiveClick, onCreateArchive } = props;
    const [isOpen, setIsOpen] = useState(true);

    const handleArchiveClick = (archive: Archive) => {
        onArchiveClick(archive);
        setIsOpen(false);
    };

    const handleCreateArchive = (archive: Archive) => {
        onCreateArchive(archive);
        setIsOpen(false);
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
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
                        />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}