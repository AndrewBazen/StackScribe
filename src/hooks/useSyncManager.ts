import { useState, useCallback } from 'react';
import { fullSync, getSyncManager } from '../lib/sync';

export interface SyncStatus {
    isLoading: boolean;
    error: string | null;
    lastSyncTime: Date | null;
}

export const useSyncManager = () => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isLoading: false,
        error: null,
        lastSyncTime: null
    });

    const handleSync = useCallback(async (syncFunction: () => Promise<void>) => {
        setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
        
        try {
            await syncFunction();
            setSyncStatus(prev => ({ 
                ...prev, 
                isLoading: false, 
                lastSyncTime: new Date(),
                error: null 
            }));
        } catch (error) {
            setSyncStatus(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: error instanceof Error ? error.message : 'Unknown sync error' 
            }));
        }
    }, []);

    const performFullSync = useCallback(() => {
        return handleSync(fullSync);
    }, [handleSync]);

    const performDownloadSync = useCallback(() => {
        return handleSync(async () => {
            const syncManager = getSyncManager();
            if (syncManager) {
                await syncManager.syncFromAzure();
            } else {
                throw new Error('Sync manager not initialized');
            }
        });
    }, [handleSync]);

    const performUploadSync = useCallback(() => {
        return handleSync(async () => {
            const syncManager = getSyncManager();
            if (syncManager) {
                await syncManager.syncToAzure();
            } else {
                throw new Error('Sync manager not initialized');
            }
        });
    }, [handleSync]);

    const clearError = useCallback(() => {
        setSyncStatus(prev => ({ ...prev, error: null }));
    }, []);

    return {
        syncStatus,
        performFullSync,
        performDownloadSync,
        performUploadSync,
        clearError
    };
};
