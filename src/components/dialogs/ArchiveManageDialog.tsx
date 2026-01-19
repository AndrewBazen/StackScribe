import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Cross2Icon, ChevronRightIcon, ChevronDownIcon, TrashIcon } from '@radix-ui/react-icons';
import { Archive } from '../../types/archive';
import { Tome } from '../../types/tome';
import { Entry } from '../../types/entry';
import {
  getAllArchives,
  getTomesByArchiveId,
  getEntriesByTomeId,
  deleteArchive,
  deleteTome,
  deleteEntry
} from '../../stores/dataStore';

type Props = {
  onClose: () => void;
  onArchiveDeleted: (archiveId: string) => void;
  onTomeDeleted: (tomeId: string) => void;
  onEntryDeleted: (entryId: string) => void;
};

type ArchiveWithCounts = Archive & {
  tomeCount?: number;
  entryCount?: number;
};

type TomeWithCount = Tome & {
  entryCount?: number;
};

type DeleteTarget = {
  type: 'archive' | 'tome' | 'entry';
  id: string;
  name: string;
  cascadeWarning?: string;
};

export default function ArchiveManageDialog({ onClose, onArchiveDeleted, onTomeDeleted, onEntryDeleted }: Props) {
  const [archives, setArchives] = useState<ArchiveWithCounts[]>([]);
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(new Set());
  const [expandedTomes, setExpandedTomes] = useState<Set<string>>(new Set());
  const [tomesByArchive, setTomesByArchive] = useState<Record<string, TomeWithCount[]>>({});
  const [entriesByTome, setEntriesByTome] = useState<Record<string, Entry[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    const allArchives = await getAllArchives();
    const archivesWithCounts: ArchiveWithCounts[] = await Promise.all(
      allArchives.map(async (archive) => {
        const tomes = await getTomesByArchiveId(archive.id);
        let entryCount = 0;
        for (const tome of tomes) {
          const entries = await getEntriesByTomeId(tome.id);
          entryCount += entries.length;
        }
        return {
          ...archive,
          tomeCount: tomes.length,
          entryCount
        };
      })
    );
    setArchives(archivesWithCounts);
  };

  const toggleArchive = async (archiveId: string) => {
    const newExpanded = new Set(expandedArchives);
    if (newExpanded.has(archiveId)) {
      newExpanded.delete(archiveId);
    } else {
      newExpanded.add(archiveId);
      if (!tomesByArchive[archiveId]) {
        const tomes = await getTomesByArchiveId(archiveId);
        const tomesWithCounts: TomeWithCount[] = await Promise.all(
          tomes.map(async (tome) => {
            const entries = await getEntriesByTomeId(tome.id);
            return { ...tome, entryCount: entries.length };
          })
        );
        setTomesByArchive(prev => ({ ...prev, [archiveId]: tomesWithCounts }));
      }
    }
    setExpandedArchives(newExpanded);
  };

  const toggleTome = async (tomeId: string) => {
    const newExpanded = new Set(expandedTomes);
    if (newExpanded.has(tomeId)) {
      newExpanded.delete(tomeId);
    } else {
      newExpanded.add(tomeId);
      if (!entriesByTome[tomeId]) {
        const entries = await getEntriesByTomeId(tomeId);
        setEntriesByTome(prev => ({ ...prev, [tomeId]: entries }));
      }
    }
    setExpandedTomes(newExpanded);
  };

  const handleDeleteClick = (target: DeleteTarget) => {
    setDeleteTarget(target);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      switch (deleteTarget.type) {
        case 'archive':
          await deleteArchive(deleteTarget.id);
          onArchiveDeleted(deleteTarget.id);
          break;
        case 'tome':
          await deleteTome(deleteTarget.id);
          onTomeDeleted(deleteTarget.id);
          break;
        case 'entry':
          await deleteEntry(deleteTarget.id);
          onEntryDeleted(deleteTarget.id);
          break;
      }
      await loadArchives();
      setTomesByArchive({});
      setEntriesByTome({});
      setExpandedArchives(new Set());
      setExpandedTomes(new Set());
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getArchiveCascadeWarning = (archive: ArchiveWithCounts) => {
    const parts = [];
    if (archive.tomeCount && archive.tomeCount > 0) {
      parts.push(`${archive.tomeCount} tome${archive.tomeCount > 1 ? 's' : ''}`);
    }
    if (archive.entryCount && archive.entryCount > 0) {
      parts.push(`${archive.entryCount} entr${archive.entryCount > 1 ? 'ies' : 'y'}`);
    }
    return parts.length > 0 ? `This will also delete ${parts.join(' and ')}.` : undefined;
  };

  const getTomeCascadeWarning = (tome: TomeWithCount) => {
    if (tome.entryCount && tome.entryCount > 0) {
      return `This will also delete ${tome.entryCount} entr${tome.entryCount > 1 ? 'ies' : 'y'}.`;
    }
    return undefined;
  };

  return (
    <>
      <Dialog.Root open={true}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content archive-manage-dialog">
            <Dialog.Title className="dialog-title">Manage Archives</Dialog.Title>
            <Dialog.Description className="dialog-description">
              View and manage your archives, tomes, and entries.
            </Dialog.Description>

            <div className="archive-manage-list">
              {archives.length === 0 ? (
                <div className="archive-manage-empty">
                  No archives found.
                </div>
              ) : (
                archives.map((archive) => (
                  <div key={archive.id} className="archive-manage-section">
                    <div className="archive-manage-item archive-level">
                      <button
                        className="expand-button"
                        onClick={() => toggleArchive(archive.id)}
                        aria-label={expandedArchives.has(archive.id) ? 'Collapse' : 'Expand'}
                      >
                        {expandedArchives.has(archive.id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </button>
                      <span className="item-name">{archive.name}</span>
                      <span className="item-count">
                        {archive.tomeCount} tome{archive.tomeCount !== 1 ? 's' : ''}, {archive.entryCount} entr{archive.entryCount !== 1 ? 'ies' : 'y'}
                      </span>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteClick({
                          type: 'archive',
                          id: archive.id,
                          name: archive.name,
                          cascadeWarning: getArchiveCascadeWarning(archive)
                        })}
                        aria-label={`Delete ${archive.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    {expandedArchives.has(archive.id) && (
                      <div className="archive-manage-tomes">
                        {!tomesByArchive[archive.id] ? (
                          <div className="loading-indicator">Loading...</div>
                        ) : tomesByArchive[archive.id].length === 0 ? (
                          <div className="no-items">No tomes</div>
                        ) : (
                          tomesByArchive[archive.id].map((tome) => (
                            <div key={tome.id} className="tome-section">
                              <div className="archive-manage-item tome-level">
                                <button
                                  className="expand-button"
                                  onClick={() => toggleTome(tome.id)}
                                  aria-label={expandedTomes.has(tome.id) ? 'Collapse' : 'Expand'}
                                >
                                  {expandedTomes.has(tome.id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                </button>
                                <span className="item-name">{tome.name}</span>
                                <span className="item-count">
                                  {tome.entryCount} entr{tome.entryCount !== 1 ? 'ies' : 'y'}
                                </span>
                                <button
                                  className="delete-button"
                                  onClick={() => handleDeleteClick({
                                    type: 'tome',
                                    id: tome.id,
                                    name: tome.name,
                                    cascadeWarning: getTomeCascadeWarning(tome)
                                  })}
                                  aria-label={`Delete ${tome.name}`}
                                >
                                  <TrashIcon />
                                </button>
                              </div>

                              {expandedTomes.has(tome.id) && (
                                <div className="archive-manage-entries">
                                  {!entriesByTome[tome.id] ? (
                                    <div className="loading-indicator">Loading...</div>
                                  ) : entriesByTome[tome.id].length === 0 ? (
                                    <div className="no-items">No entries</div>
                                  ) : (
                                    entriesByTome[tome.id].map((entry) => (
                                      <div key={entry.id} className="archive-manage-item entry-level">
                                        <span className="item-name">{entry.name}</span>
                                        <span className="item-type">{entry.entry_type}</span>
                                        <button
                                          className="delete-button"
                                          onClick={() => handleDeleteClick({
                                            type: 'entry',
                                            id: entry.id,
                                            name: entry.name
                                          })}
                                          aria-label={`Delete ${entry.name}`}
                                        >
                                          <TrashIcon />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
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

      <AlertDialog.Root open={deleteTarget !== null}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="alert-dialog-overlay" />
          <AlertDialog.Content className="alert-dialog-content">
            <AlertDialog.Title className="alert-dialog-title">
              Delete {deleteTarget?.type}?
            </AlertDialog.Title>
            <AlertDialog.Description className="alert-dialog-description">
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.cascadeWarning && (
                <span className="delete-warning"> {deleteTarget.cascadeWarning}</span>
              )}
              <br />This action cannot be undone.
            </AlertDialog.Description>
            <div className="alert-dialog-actions">
              <AlertDialog.Cancel asChild>
                <button className="alert-dialog-button cancel" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  className="alert-dialog-button delete"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
