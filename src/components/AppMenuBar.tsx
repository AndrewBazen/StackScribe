import * as MenuBar from "@radix-ui/react-menubar";
import { getSyncManager } from '../lib/sync';

type AppMenuBarProps = {
    onNewTome: () => void;
    onNewEntry: () => void;
    onSave: () => void;
    onSaveAll: () => void;
    onClose: () => void;
    onPreferences: () => void;
}

export function AppMenuBar({ onNewTome, onNewEntry, onSave, onSaveAll, onClose, onPreferences }: AppMenuBarProps) {  
    const handleSyncToAzure = async () => {
        const syncManager = getSyncManager();
        if (syncManager) {
            try {
                await syncManager.syncToAzure();
                // You might want to show a toast notification here
                console.log('✅ Sync to Azure completed');
            } catch (error) {
                console.error('❌ Sync to Azure failed:', error);
                // Show error notification
            }
        }
    };

    const handleSyncFromAzure = async () => {
        const syncManager = getSyncManager();
        if (syncManager) {
            try {
                await syncManager.syncFromAzure();
                // Refresh the UI state here - you might want to emit an event
                // or use a state management solution
                window.location.reload(); // Simple approach for now
            } catch (error) {
                console.error('❌ Sync from Azure failed:', error);
            }
        }
    };

    const handleFullSync = async () => {
        const syncManager = getSyncManager();
        if (syncManager) {
            try {
                await syncManager.fullSync();
                window.location.reload(); // Refresh to show updated data
            } catch (error) {
                console.error('❌ Full sync failed:', error);
            }
        }
    };

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
                    <MenuBar.Separator className="menubar-separator" />
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={handleSyncToAzure}>Sync to Azure</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={handleSyncFromAzure}>Sync from Azure</MenuBar.Label>
                    </MenuBar.Item>
                    <MenuBar.Item>
                    <MenuBar.Label className="menubar-label" onClick={handleFullSync}>Full Sync</MenuBar.Label>
                    </MenuBar.Item>
                </MenuBar.Content>
                </MenuBar.Portal>
            </MenuBar.Menu>
        </MenuBar.Root>
    );
}