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
                <Dialog.Content className="dialog-content" >
                    <Dialog.Title className="dialog-title">StackScribe</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Select an archive to get started.
                    </Dialog.Description>
                    <div id="start-content-inner" className="dialog-content-inner">
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