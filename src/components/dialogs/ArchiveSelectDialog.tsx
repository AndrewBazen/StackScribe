import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Archive } from '../../types/archive';

type Props = {
  archives: Archive[];
  onSelect: (archive: Archive) => void;
  onClose: () => void;
};

export default function ArchiveSelectDialog({ archives, onSelect, onClose }: Props) {
  const handleSelect = (archive: Archive) => {
    onSelect(archive);
    onClose();
  };

  return (
    <Dialog.Root open={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content archive-select-dialog">
          <Dialog.Title className="dialog-title">Open Archive</Dialog.Title>
          <Dialog.Description className="dialog-description">
            Select an archive to open.
          </Dialog.Description>

          <div className="archive-select-list">
            {archives.length === 0 ? (
              <div className="archive-select-empty">
                No archives found. Create a new archive to get started.
              </div>
            ) : (
              archives.map((archive) => (
                <div
                  key={archive.id}
                  className="archive-select-item"
                  onClick={() => handleSelect(archive)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(archive);
                    }
                  }}
                >
                  <div className="archive-select-name">{archive.name}</div>
                  {archive.description && (
                    <div className="archive-select-description">{archive.description}</div>
                  )}
                </div>
              ))
            )}
          </div>

          <button type="button" onClick={onClose} className="close-button" aria-label="Close">
            <Cross2Icon />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
