import * as MenuBar from "@radix-ui/react-menubar";
import { Archive } from "../types/archive";

type AppMenuBarProps = {
    onCreateArchive: (newArchive: Archive, archiveName: string) => void;
    onSwitchArchive: () => void;
    onNewTome: () => void;
    onNewEntry: () => void;
    onSave: () => void;
    onSaveAll: () => void;
    onClose: () => void;
    onPreferences: () => void;
}

export function AppMenuBar({ onCreateArchive, onSwitchArchive, onNewTome, onNewEntry, onSave, onSaveAll, onClose, onPreferences }: AppMenuBarProps) {  

    const handleCreateArchive = () => {
        const archiveName = prompt("Enter a name for the new archive");
        if (archiveName) {
            onCreateArchive(
            {
                id: "",
                name: archiveName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
                archiveName
            );
        }
    }

return (
    <MenuBar.Root style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '60px' }}>
            <MenuBar.Menu>
            <MenuBar.Trigger className="menubar-trigger">File</MenuBar.Trigger>
            <MenuBar.Portal>
                <MenuBar.Content 
                    className="menubar-content"
                    align="start"
                    alignOffset={-3}
                    sideOffset={5}
                    side="top"
                >
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={handleCreateArchive}>Create Archive</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onSwitchArchive}>Open Archive</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onNewTome}>New Tome</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onNewEntry}>New Entry</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Separator className="menubar-separator" />
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onSave}>Save</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onSaveAll}>Save All</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Separator className="menubar-separator" />
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onPreferences}>Preferences</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onClose}>Close</MenuBar.Label>
                    </MenuBar.Item>
                </MenuBar.Content>
                </MenuBar.Portal>
            </MenuBar.Menu>
            <MenuBar.Menu>
                <MenuBar.Trigger className="menubar-trigger">Edit</MenuBar.Trigger>
                <MenuBar.Portal>
                    <MenuBar.Content 
                        className="menubar-content" 
                        align="start" 
                        alignOffset={-3} 
                        sideOffset={5} 
                        side="top"
                    >
                        <MenuBar.Item>
                            <MenuBar.Label className="menubar-label">Undo</MenuBar.Label>
                        </MenuBar.Item>
                        <MenuBar.Item>
                            <MenuBar.Label className="menubar-label">Redo</MenuBar.Label>
                        </MenuBar.Item>
                        <MenuBar.Separator className="menubar-separator" />
                    </MenuBar.Content>
                </MenuBar.Portal>
            </MenuBar.Menu>
        </MenuBar.Root>
    );
}