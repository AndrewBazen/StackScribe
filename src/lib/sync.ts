import { getDb } from './db';
import { setLastSyncedAt } from '../stores/dataStore';
import { Archive } from '../types/archive';
import { Tome } from '../types/tome';
import { Entry } from '../types/entry';

export interface SyncStatus {
  isInitializing: boolean;
  isSyncing: boolean;
  isReady: boolean;
  error: string | null;
}

export interface SyncManager {
  syncToAzure(): Promise<void>;
  syncFromAzure(): Promise<void>;
  fullSync(): Promise<void>;
  getSyncStatus(): SyncStatus;
  waitForInitialization(): Promise<void>;
}

export class AzureSyncManager implements SyncManager {
  private msalInstance: any;
  private account: any;
  private azureFunctionUrl: string;
  private isSyncing: boolean = false;
  private syncPromise: Promise<void> | null = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private error: string | null = null;
  private initializationPromise: Promise<void> | null = null;
  private statusChangeCallbacks: ((status: SyncStatus) => void)[] = [];

  constructor(msalInstance: any, account: any) {
    this.msalInstance = msalInstance;
    this.account = account;
    // Update this URL to match your deployed Azure Function
    this.azureFunctionUrl = import.meta.env.VITE_AZURE_FUNCTION_URL;
    console.log('🔗 Azure Function URL:', this.azureFunctionUrl);
  }

  public getSyncStatus(): SyncStatus {
    return {
      isInitializing: this.isInitializing,
      isSyncing: this.isSyncing,
      isReady: this.isReady,
      error: this.error
    };
  }

  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusChangeCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyStatusChange() {
    const status = this.getSyncStatus();
    this.statusChangeCallbacks.forEach(callback => callback(status));
  }

  private setStatus(updates: Partial<{ isInitializing: boolean; isSyncing: boolean; isReady: boolean; error: string | null }>) {
    if (updates.isInitializing !== undefined) this.isInitializing = updates.isInitializing;
    if (updates.isSyncing !== undefined) this.isSyncing = updates.isSyncing;
    if (updates.isReady !== undefined) this.isReady = updates.isReady;
    if (updates.error !== undefined) this.error = updates.error;
    this.notifyStatusChange();
  }

  public async waitForInitialization(): Promise<void> {
    if (this.isReady) return;
    if (this.initializationPromise) return this.initializationPromise;
    
    this.initializationPromise = this.performInitialSync();
    return this.initializationPromise;
  }

  private async performInitialSync(): Promise<void> {
    if (this.isReady) return;
    
    this.setStatus({ isInitializing: true, error: null });
    
    try {
      console.log('🔄 Starting initial sync from Azure...');
      await this.syncFromAzure();
      this.setStatus({ isInitializing: false, isReady: true });
      console.log('✅ Initial sync completed successfully');
    } catch (error) {
      console.log('⚠️ Initial sync failed (this is OK if offline):', error);
      // Don't block the app if sync fails - allow offline usage
      this.setStatus({ 
        isInitializing: false, 
        isReady: true, 
        error: error instanceof Error ? error.message : 'Initial sync failed'
      });
    }
  }

  private getUserId(): string {
    // Extract user ID using the same logic as the Azure Function
    if (this.account?.localAccountId) {
      return this.account.localAccountId;
    }
    if (this.account?.homeAccountId) {
      return this.account.homeAccountId.split('.')[0]; // Remove tenant part
    }
    if (this.account?.username) {
      return this.account.username;
    }
    throw new Error('Could not extract user ID from account');
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
      
      // Update last sync timestamp
      const userId = this.getUserId();
      await setLastSyncedAt(new Date().toISOString(), userId);
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

    this.setStatus({ isSyncing: true, error: null });

    try {
      console.log('🔄 Starting sync from Azure...');
      
      // Get access token
      const tokenResponse = await this.msalInstance.acquireTokenSilent({
        scopes: ["User.Read"], // Use a basic scope that works
        account: this.account
      });

      console.log('🔑 Token acquired, length:', tokenResponse.accessToken.length);
      // Log part of the token payload for debugging (don't log sensitive data in production)
      try {
        const payload = JSON.parse(atob(tokenResponse.accessToken.split('.')[1]));
        console.log('👤 Token payload userId candidates:', {
          sub: payload.sub,
          oid: payload.oid,
          preferred_username: payload.preferred_username
        });
      } catch (e) {
        console.warn('⚠️ Could not parse token payload for debugging');
      }

      // Fetch data from Azure Function
      const response = await fetch(`${this.azureFunctionUrl}/api/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenResponse.accessToken}`
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error details:', errorText);
        throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('❌ Non-JSON response received:', responseText.substring(0, 200));
        throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 100)}...`);
      }

      const result = await response.json();
      const { archives, tomes, entries } = result.data;

      console.log(`📊 Received ${archives.length} archives, ${tomes.length} tomes, ${entries.length} entries from Azure`);

      // Save data to local SQLite with retry logic for database locks
      const db = await getDb();
      
      // Add retry logic for database lock issues with exponential backoff
      const maxRetries = 5;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          // First, ensure any hanging transactions are rolled back
          try {
            await db.execute('ROLLBACK');
          } catch (rollbackError) {
            // Ignore rollback errors if no transaction is active
          }
          
          // Wait a bit longer between retries for SQLite locks
          if (retryCount > 0) {
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Exponential backoff, max 5 seconds
            console.warn(`⚠️ Database locked, waiting ${delay}ms before retry ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Use a simpler approach - try without transaction first
          if (retryCount >= 2) {
            console.log('🔄 Trying without transaction...');
            // Clear existing data
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
                'INSERT INTO entries (id, tome_id, name, content, entry_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [entry.id, entry.tome_id, entry.name, entry.content, entry.entry_type, entry.created_at, entry.updated_at]
              );
            }
          } else {
            // Use transaction with proper timeout handling
            await db.execute('BEGIN IMMEDIATE TRANSACTION');
            
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
                  'INSERT INTO entries (id, tome_id, name, content, entry_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [entry.id, entry.tome_id, entry.name, entry.content, entry.entry_type, entry.created_at, entry.updated_at]
                );
              }

              await db.execute('COMMIT');
            } catch (transactionError) {
              await db.execute('ROLLBACK');
              throw transactionError;
            }
          }
          
          console.log('✅ Sync from Azure completed successfully');
          
          // Update last sync timestamp
          const userId = this.getUserId();
          await setLastSyncedAt(new Date().toISOString(), userId);
          
          break; // Success, exit retry loop
          
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('database is locked') && retryCount < maxRetries) {
            continue; // Retry
          }
          
          // If it's not a lock error or we've exhausted retries, throw the error
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Sync from Azure failed:', error);
      this.setStatus({ isSyncing: false, error: error instanceof Error ? error.message : 'Sync failed' });
      throw error;
    } finally {
      this.setStatus({ isSyncing: false });
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
    this.setStatus({ isSyncing: true, error: null });
    
    try {
      console.log('🔄 Starting full sync...');
      
      // First sync local changes to Azure
      await this.syncToAzure();
      
      // Then sync changes from Azure back to local
      await this.syncFromAzure();
      
      console.log('✅ Full sync completed successfully');
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      this.setStatus({ error: error instanceof Error ? error.message : 'Full sync failed' });
      throw error;
    } finally {
      this.setStatus({ isSyncing: false });
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