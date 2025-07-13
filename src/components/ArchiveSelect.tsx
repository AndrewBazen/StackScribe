import * as React from "react";
import { Archive } from "../types/archive";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import ArchiveList from "./ArchiveList";
import * as Dialog from "@radix-ui/react-dialog";
import { SyncStatus } from "../lib/sync";

interface ArchiveSelectProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive, tomeName: string) => void; // Pass tome name separately
    syncStatus: SyncStatus;
}

const CreateArchiveDialog = (props: { 
    onCreateArchive: (archive: Archive, tomeName: string) => void;
    syncStatus: SyncStatus;
}) => {
    const { onCreateArchive, syncStatus } = props;
    const archiveNameRef = React.useRef<HTMLInputElement>(null);
    const tomeNameRef = React.useRef<HTMLInputElement>(null);

    const handleCreateArchive = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!syncStatus.isReady) {
            console.warn('⚠️ Cannot create archive while sync is in progress');
            return;
        }
        
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
                <button 
                    className="create-archive-button" 
                    aria-label="Create Archive"
                    disabled={!syncStatus.isReady}
                    style={{ 
                        opacity: syncStatus.isReady ? 1 : 0.5,
                        cursor: syncStatus.isReady ? 'pointer' : 'not-allowed'
                    }}
                >
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
                            <input 
                                type="text" 
                                placeholder="Archive Name" 
                                className="input" 
                                ref={archiveNameRef} 
                                required 
                                minLength={1} 
                                maxLength={255} 
                                pattern="^[a-zA-Z0-9 ]+$" 
                                title="Name must be alphanumeric"
                                disabled={!syncStatus.isReady}
                            />
                        </fieldset>
                        <fieldset className="dialog-fieldset">
                            <label className="dialog-label">Tome Name</label>
                            <input 
                                type="text" 
                                placeholder="Tome Name" 
                                className="input" 
                                ref={tomeNameRef} 
                                required 
                                minLength={1} 
                                maxLength={255} 
                                pattern="^[a-zA-Z0-9 ]+$" 
                                title="Name must be alphanumeric"
                                disabled={!syncStatus.isReady}
                            />
                        </fieldset>
                        <div id="create-archive-buttons" className="dialog-buttons">
                            <Dialog.Close asChild>
                                <button className="close-button" aria-label="Close"><Cross2Icon /></button>
                            </Dialog.Close>
                            <button 
                                type="submit" 
                                className="create-button" 
                                aria-label="Create"
                                disabled={!syncStatus.isReady}
                            >
                                Create
                            </button>
                        </div>
                    </form>
                   
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default function ArchiveSelect(props: ArchiveSelectProps) {
    const { archives, onArchiveClick, onCreateArchive, syncStatus } = props;

    const handleArchiveClick = (archive: Archive) => {
        if (!syncStatus.isReady) {
            console.warn('⚠️ Cannot open archive while sync is in progress');
            return;
        }
        onArchiveClick(archive);
    };

    return (
        <div id="archive-select" className="view">
            <CreateArchiveDialog onCreateArchive={onCreateArchive} syncStatus={syncStatus} />
            <div id="archive-list-container" className="view">
                <ArchiveList 
                    archives={archives} 
                    onArchiveClick={handleArchiveClick} 
                    syncStatus={syncStatus}
                />
            </div>
        </div>
    );
}