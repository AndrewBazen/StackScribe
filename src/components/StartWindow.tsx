import { useState } from "react";
import { Archive } from "../types/archive";
import ArchiveSelect from "./ArchiveSelect";
import * as Dialog from "@radix-ui/react-dialog";

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
                <Dialog.Content className="start-window" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", justifyContent: "center" }}>
                    <Dialog.Title>StackScribe</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Select an archive to get started.
                    </Dialog.Description>
                    <div className="start-window-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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