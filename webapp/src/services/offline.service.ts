/**
 * Offline Storage Service using IndexedDB
 * Caches interventions for offline access
 */

const DB_NAME = 'TelcoManagerOffline';
const DB_VERSION = 1;
const STORE_INTERVENTIONS = 'interventions';
const STORE_SYNC_QUEUE = 'syncQueue';

let db: IDBDatabase | null = null;

// Initialize the database
export const initOfflineDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Interventions store
            if (!database.objectStoreNames.contains(STORE_INTERVENTIONS)) {
                const interventionStore = database.createObjectStore(STORE_INTERVENTIONS, { keyPath: 'id' });
                interventionStore.createIndex('clientId', 'clientId', { unique: false });
                interventionStore.createIndex('technicienId', 'technicienId', { unique: false });
                interventionStore.createIndex('datePlanifiee', 'datePlanifiee', { unique: false });
            }

            // Sync queue for offline changes
            if (!database.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
                database.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
};

// Save interventions to IndexedDB
export const cacheInterventions = async (interventions: { id: string; datePlanifiee: string; technicienId?: string }[]): Promise<void> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_INTERVENTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_INTERVENTIONS);

    interventions.forEach(intervention => {
        store.put(intervention);
    });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            console.log(`Cached ${interventions.length} interventions for offline use`);
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

// Get cached interventions
export const getCachedInterventions = async (): Promise<any[]> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_INTERVENTIONS], 'readonly');
    const store = transaction.objectStore(STORE_INTERVENTIONS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Get a single cached intervention
export const getCachedIntervention = async (id: string): Promise<any | null> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_INTERVENTIONS], 'readonly');
    const store = transaction.objectStore(STORE_INTERVENTIONS);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

// Queue an action for sync when back online
interface SyncAction {
    type: 'update' | 'create';
    endpoint: string;
    data: Record<string, unknown>;
    timestamp: number;
}

export const queueForSync = async (action: SyncAction): Promise<void> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    store.add({ ...action, timestamp: Date.now() });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
            console.log('Action queued for sync:', action.type);
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
};

// Get pending sync actions
export const getPendingSyncActions = async (): Promise<SyncAction[]> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Clear sync queue after successful sync
export const clearSyncQueue = async (): Promise<void> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    store.clear();

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// Check if online
export const isOnline = (): boolean => {
    return navigator.onLine;
};

// Listen for online/offline events
export const onConnectionChange = (callback: (online: boolean) => void): () => void => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};

// Remove a single action from sync queue
export const removeSyncAction = async (id: number): Promise<void> => {
    const database = await initOfflineDB();
    const transaction = database.transaction([STORE_SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORE_SYNC_QUEUE);
    store.delete(id);

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// Process sync queue when back online
export const processSyncQueue = async (): Promise<{ success: number; failed: number }> => {
    if (!isOnline()) {
        console.log('Cannot sync: still offline');
        return { success: 0, failed: 0 };
    }

    const pendingActions = await getPendingSyncActions();

    if (pendingActions.length === 0) {
        console.log('No pending actions to sync');
        return { success: 0, failed: 0 };
    }

    console.log(`Processing ${pendingActions.length} queued actions...`);

    let success = 0;
    let failed = 0;

    // Get auth token
    const token = sessionStorage.getItem('token');
    if (!token) {
        console.warn('No auth token for sync');
        return { success: 0, failed: pendingActions.length };
    }

    for (const action of pendingActions) {
        try {
            const method = action.type === 'create' ? 'POST' : 'PUT';

            const response = await fetch(`/api${action.endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(action.data),
            });

            if (response.ok) {
                // Remove from queue on success
                await removeSyncAction((action as any).id);
                success++;
                console.log(`Synced action: ${action.type} ${action.endpoint}`);
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Failed to sync action: ${response.status}`, errorData);
                failed++;
            }
        } catch (error) {
            console.error('Sync error:', error);
            failed++;
        }
    }

    console.log(`Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
};

// Auto-sync when coming back online
let syncListenerActive = false;

export const enableAutoSync = (): void => {
    if (syncListenerActive) return;

    syncListenerActive = true;

    window.addEventListener('online', async () => {
        console.log('Back online - starting auto-sync...');

        // Small delay to ensure network is stable
        setTimeout(async () => {
            const result = await processSyncQueue();
            if (result.success > 0) {
                // Dispatch custom event to notify UI
                window.dispatchEvent(new CustomEvent('syncComplete', {
                    detail: result
                }));
            }
        }, 2000);
    });

    console.log('Auto-sync enabled');
};
