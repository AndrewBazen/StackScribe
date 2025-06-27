import * as React from "react";
import { Archive } from "../types/archive";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import ArchiveList from "./ArchiveList";
import * as Dialog from "@radix-ui/react-dialog";
import { invoke } from "@tauri-apps/api/core";

interface ArchiveSelectProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive) => void;
}

const CreateArchiveDialog = (props: { onCreateArchive: (archive: Archive) => void }) => {
    const { onCreateArchive } = props;
    const archiveNameRef = React.useRef<HTMLInputElement>(null);

    const handleCreateArchive = async (e: React.FormEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const archiveName = archiveNameRef.current?.value;
        if (archiveName) {  
            const archive = await invoke("create_archive", { archiveName });
            onCreateArchive(archive as unknown as Archive);
            archiveNameRef.current!.value = "";
        }
    };

    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button className="create-archive-button" aria-label="Create Archive">
                    <PlusIcon />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                    <Dialog.Title className="dialog-title">New Archive</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Create a new archive to store your documents.
                    </Dialog.Description>
                    <fieldset className="dialog-fieldset">
                        <label className="dialog-label">Archive Name</label>
                        <input type="text" placeholder="Archive Name" className="input" ref={archiveNameRef} />
                    </fieldset>
                    <div id="create-archive-buttons" className="dialog-buttons">
                        <Dialog.Close asChild>
                            <button className="create-button" aria-label="Create" onClick={handleCreateArchive}>Create</button>
                        </Dialog.Close>
                    </div>
                    <Dialog.Close asChild>
                            <button className="close-button" aria-label="Close"><Cross2Icon /></button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default function ArchiveSelect(props: ArchiveSelectProps) {
    const { archives, onArchiveClick, onCreateArchive } = props;

    const handleArchiveClick = (archive: Archive) => {
        onArchiveClick(archive);
    };

    return (
        <div id="archive-select" className="view">
            <CreateArchiveDialog onCreateArchive={onCreateArchive} />
            <div id="archive-list-container" className="view">
                <ArchiveList archives={archives} onArchiveClick={handleArchiveClick} />
            </div>
        </div>
    );
}