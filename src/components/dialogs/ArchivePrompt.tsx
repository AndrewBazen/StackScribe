import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useRef, FormEvent } from 'react';
import { Archive } from '../../types/archive';

type Props = {
  onConfirm: (archive: Archive, tomeName: string) => void;
  onClose: () => void;
};

export default function ArchivePrompt({ onConfirm, onClose }: Props) {
  const archiveNameRef = useRef<HTMLInputElement>(null);
  const tomeNameRef = useRef<HTMLInputElement>(null);

  const handleConfirm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const archiveName = archiveNameRef.current?.value.trim();
    const tomeName = tomeNameRef.current?.value.trim();

    if (archiveName && tomeName && e.currentTarget.checkValidity()) {
      const archive: Archive = {
        id: crypto.randomUUID(),
        name: archiveName,
        description: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onConfirm(archive, tomeName);
    }
  };

  return (
    <Dialog.Root open={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">New Archive</Dialog.Title>
          <Dialog.Description className="dialog-description">
            Create a new archive to store your documents.
          </Dialog.Description>
          <form onSubmit={handleConfirm} className="dialog-form">
            <fieldset className="dialog-fieldset">
              <label className="dialog-label">Archive Name</label>
              <input
                ref={archiveNameRef}
                className="input"
                required
                minLength={1}
                maxLength={255}
                pattern="^[a-zA-Z0-9 ]+$"
                title="Name can contain letters, numbers, and spaces"
                placeholder="Enter archive name"
                autoFocus
              />
            </fieldset>
            <fieldset className="dialog-fieldset">
              <label className="dialog-label">Initial Tome Name</label>
              <input
                ref={tomeNameRef}
                className="input"
                required
                minLength={1}
                maxLength={255}
                pattern="^[a-zA-Z0-9 ]+$"
                title="Name can contain letters, numbers, and spaces"
                placeholder="Enter tome name"
              />
            </fieldset>
            <div className="dialog-buttons">
              <button type="submit" className="create-button" aria-label="Create">
                Create
              </button>
              <button type="button" onClick={onClose} className="close-button" aria-label="Close">
                <Cross2Icon />
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
