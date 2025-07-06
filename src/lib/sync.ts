import { getDb } from './db';
import { Archive } from '../types/archive';
import { Tome } from '../types/tome';
import { Entry } from '../types/entry';

export interface SyncManager {
  syncToAzure(): Promise<void>;
  syncFromAzure(): Promise<void>;
  fullSync(): Promise<void>;
}

export class AzureSyncManager implements SyncManager {
  private msalInstance: any;
  private account: any;
  private azureFunctionUrl: string;
  private isSyncing: boolean = false;
  private syncPromise: Promise<void> | null = null;

  constructor(msalInstance: any, account: any) {
    this.msalInstance = msalInstance;
    this.account = account;
    // Update this URL to match your deployed Azure Function
    this.azureFunctionUrl = import.meta.env.REACT_APP_AZURE_FUNCTION_URL || 
      'https://stackscribe-sync-exaycnehhqgxdhen.westeurope-01.azurewebsites.net';
  }

  async syncToAzure(): Promise<void> {
    try {
      console.log('🔄 Starting sync to Azure...');
      
      // Get access token with simpler scope
      const tokenResponse = await this.msalInstance.acquireTokenSilent({
        scopes: ["User.Read"], // Use a basic scope that works
        account: this.account
      });

      // Extract data from local SQLite
      const db = await getDb();
      const [archives, tomes, entries] = await Promise.all([
        db.select('SELECT * FROM archives') as Promise<Archive[]>,
        db.select('SELECT * FROM tomes') as Promise<Tome[]>,
        db.select('SELECT * FROM entries') as Promise<Entry[]>
      ]);

      console.log(`📊 Syncing ${archives.length} archives, ${tomes.length} tomes, ${entries.length} entries`);

      // Send to Azure Function
      const response = await fetch(`${this.azureFunctionUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResponse.accessToken}`
        },
        body: JSON.stringify({
          data: { archives, tomes, entries }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Sync to Azure completed successfully:', result);
    } catch (error) {
      console.error('❌ Sync to Azure failed:', error);
      throw error;
    }
  }

  async syncFromAzure(): Promise<void> {
    // Check if already syncing
    if (this.isSyncing && this.syncPromise) {
      console.warn('⚠️ Full sync in progress, skipping individual syncFromAzure');
      return;
    }

    try {
      console.log('🔄 Starting sync from Azure...');
      
      // Get access token
      const tokenResponse = await this.msalInstance.acquireTokenSilent({
        scopes: ["User.Read"], // Use a basic scope that works
        account: this.account
      });

      // Fetch data from Azure Function
      const response = await fetch(`${this.azureFunctionUrl}/api/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResponse.accessToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      const { archives, tomes, entries } = result.data;

      console.log(`📊 Received ${archives.length} archives, ${tomes.length} tomes, ${entries.length} entries from Azure`);

      // Save data to local SQLite
      const db = await getDb();
      
      // Use transactions for better performance and consistency
      await db.execute('BEGIN TRANSACTION');
      
      try {
        // Clear existing data (you might want to implement smarter merging logic)
        await db.execute('DELETE FROM entries');
        await db.execute('DELETE FROM tomes');
        await db.execute('DELETE FROM archives');

        // Insert archives
        for (const archive of archives) {
          await db.execute(
            'INSERT INTO archives (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [archive.id, archive.name, archive.description, archive.created_at, archive.updated_at]
          );
        }

        // Insert tomes
        for (const tome of tomes) {
          await db.execute(
            'INSERT INTO tomes (id, archive_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [tome.id, tome.archive_id, tome.name, tome.description, tome.created_at, tome.updated_at]
          );
        }

        // Insert entries
        for (const entry of entries) {
          await db.execute(
            'INSERT INTO entries (id, tome_id, name, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [entry.id, entry.tome_id, entry.name, entry.content, entry.created_at, entry.updated_at]
          );
        }

        await db.execute('COMMIT');
        console.log('✅ Sync from Azure completed successfully');
      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('❌ Sync from Azure failed:', error);
      throw error;
    }
  }

  async fullSync(): Promise<void> {
    // Prevent concurrent sync operations
    if (this.isSyncing) {
      console.warn('⚠️ Sync already in progress, waiting for it to complete...');
      if (this.syncPromise) {
        return this.syncPromise;
      }
      return;
    }

    this.isSyncing = true;
    this.syncPromise = this._performFullSync();
    
    try {
      await this.syncPromise;
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
    }
  }

  private async _performFullSync(): Promise<void> {
    try {
      console.log('🔄 Starting full sync...');
      
      // First sync local changes to Azure
      await this.syncToAzure();
      
      // Then sync changes from Azure back to local
      await this.syncFromAzure();
      
      console.log('✅ Full sync completed successfully');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }
}

// Global sync manager instance
let syncManager: AzureSyncManager | null = null;

export const initializeSyncManager = (msalInstance: any, account: any) => {
  syncManager = new AzureSyncManager(msalInstance, account);
  return syncManager;
};

export const getSyncManager = (): AzureSyncManager | null => {
  return syncManager;
};

// Convenience function for the current fullSync call in your app
export const fullSync = async (): Promise<void> => {
  if (!syncManager) {
    console.warn('⚠️ Sync manager not initialized, skipping sync');
    return;
  }
  
  try {
    await syncManager.fullSync();
  } catch (error) {
    console.error('❌ Full sync failed:', error);
    // Don't throw the error so the app continues to work offline
  }
};