import * as MenuBar from "@radix-ui/react-menubar";

type AppMenuBarProps = {
    onOpenArchive: () => void;
    onNewArchive: () => void;
    onNewTome: () => void;
    onNewEntry: () => void;
    onSave: () => void;
    onSaveAll: () => void;
    onClose: () => void;
    onPreferences: () => void;
}

export function AppMenuBar({ onOpenArchive, onNewArchive, onNewTome, onNewEntry, onSave, onSaveAll, onClose, onPreferences }: AppMenuBarProps) {  
    
return (
    <MenuBar.Root>
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
                    <MenuBar.Label className="menubar-label" onClick={onOpenArchive}>Open Archive</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={onNewArchive}>New Archive</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Separator className="menubar-separator" />
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
        </MenuBar.Root>
    );
}