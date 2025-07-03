import * as React from "react";
import { Archive } from "../types/archive";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import ArchiveList from "./ArchiveList";
import * as Dialog from "@radix-ui/react-dialog";

interface ArchiveSelectProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive, tomeName: string) => void; // Pass tome name separately
}

const CreateArchiveDialog = (props: { onCreateArchive: (archive: Archive, tomeName: string) => void }) => {
    const { onCreateArchive } = props;
    const archiveNameRef = React.useRef<HTMLInputElement>(null);
    const tomeNameRef = React.useRef<HTMLInputElement>(null);

    const handleCreateArchive = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const archiveName = archiveNameRef.current?.value;
        const tomeName = tomeNameRef.current?.value;
        if (archiveName && tomeName && e.currentTarget.checkValidity()) {
            // Create the archive object without any tomes
            const archive: Archive = {
                id: crypto.randomUUID(),
                name: archiveName,
                description: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tomes: [], // Empty - App will create the tome properly
            };
            
            onCreateArchive(archive, tomeName); // Pass tome name separately
            archiveNameRef.current!.value = "";
            tomeNameRef.current!.value = "";
        } else {
            return;
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
                    <form onSubmit={handleCreateArchive} className="dialog-form">
                        <fieldset className="dialog-fieldset">
                            <label className="dialog-label">Archive Name</label>
                            <input type="text" placeholder="Archive Name" className="input" ref={archiveNameRef} required minLength={1} maxLength={255} pattern="^[a-zA-Z0-9]+$" title="Name must be alphanumeric" />
                        </fieldset>
                        <fieldset className="dialog-fieldset">
                            <label className="dialog-label">Tome Name</label>
                            <input type="text" placeholder="Tome Name" className="input" ref={tomeNameRef} required minLength={1} maxLength={255} pattern="^[a-zA-Z0-9]+$" title="Name must be alphanumeric" />
                        </fieldset>
                        <div id="create-archive-buttons" className="dialog-buttons">
                            <Dialog.Close asChild>
                                <button className="close-button" aria-label="Close"><Cross2Icon /></button>
                            </Dialog.Close>
                            <button type="submit" className="create-button" aria-label="Create">Create</button>
                        </div>
                    </form>
                   
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