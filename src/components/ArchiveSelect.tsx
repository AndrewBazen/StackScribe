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
        <div className="create-archive-dialog">
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button type="button" className="create-archive-button" aria-label="Create Archive">
                    <PlusIcon />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="dialog-content">
                    <Dialog.Title>New Archive</Dialog.Title>
                    <Dialog.Description className="dialog-description">
                        Create a new archive to store your documents.
                    </Dialog.Description>
                    <fieldset className="dialog-fieldset">
                        <label className="dialog-label">Archive Name</label>
                        <input type="text" placeholder="Archive Name" className="dialog-input" ref={archiveNameRef} />
                    </fieldset>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <Dialog.Close asChild>
                            <button className="create-button" aria-label="Create" onClick={handleCreateArchive}>Create</button>
                        </Dialog.Close>
                    </div>
                    <Dialog.Close asChild>
                        <button className="cross-button" aria-label="Close"><Cross2Icon /></button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
        </div>
    );
};

export default function ArchiveSelect(props: ArchiveSelectProps) {
    const { archives, onArchiveClick, onCreateArchive } = props;

    const handleArchiveClick = (archive: Archive) => {
        onArchiveClick(archive);
    };

    return (
        <div className="archive-select" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <CreateArchiveDialog onCreateArchive={onCreateArchive} />
            <ArchiveList archives={archives} onArchiveClick={handleArchiveClick} />
        </div>
    );
}