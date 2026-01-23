import * as React from "react";
import { Archive } from "../../types/archive";
import { Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import ArchiveList from "./ArchiveList";
import * as Dialog from "@radix-ui/react-dialog";

interface ArchiveSelectProps {
    archives: Archive[];
    onArchiveClick: (archive: Archive) => void;
    onCreateArchive: (archive: Archive, tomeName: string) => void;
    isReady: boolean;
}

const CreateArchiveDialog = (props: {
    onCreateArchive: (archive: Archive, tomeName: string) => void;
    isReady: boolean;
}) => {
    const { onCreateArchive, isReady } = props;
    const archiveNameRef = React.useRef<HTMLInputElement>(null);
    const tomeNameRef = React.useRef<HTMLInputElement>(null);

    const handleCreateArchive = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!isReady) {
            console.warn('⚠️ Cannot create archive while app is initializing');
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
                    disabled={!isReady}
                    style={{
                        opacity: isReady ? 1 : 0.5,
                        cursor: isReady ? 'pointer' : 'not-allowed'
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
                                disabled={!isReady}
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
                                disabled={!isReady}
                            />
                        </fieldset>
                        <div className="dialog-buttons">
                            <Dialog.Close asChild>
                                <button className="close-button" aria-label="Close"><Cross2Icon /></button>
                            </Dialog.Close>
                            <button
                                type="submit"
                                className="create-button"
                                aria-label="Create"
                                disabled={!isReady}
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
    const { archives, onArchiveClick, onCreateArchive, isReady } = props;

    const handleArchiveClick = (archive: Archive) => {
        if (!isReady) {
            console.warn('⚠️ Cannot open archive while app is initializing');
            return;
        }
        onArchiveClick(archive);
    };

    return (
        <div className="dialog-archive-select view">
            <CreateArchiveDialog onCreateArchive={onCreateArchive} isReady={isReady} />
            <div className="dialog-archive-list-container view">
                <ArchiveList
                    archives={archives}
                    onArchiveClick={handleArchiveClick}
                    isReady={isReady}
                />
            </div>
        </div>
    );
}
