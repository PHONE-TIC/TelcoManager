import { useState, useEffect, useCallback } from 'react';
import {
    isOnline,
    onConnectionChange,
    getCachedInterventions,
    getCachedIntervention,
    cacheInterventions,
    enableAutoSync,
    processSyncQueue,
    getPendingSyncActions,
} from '../services/offline.service';

interface UseOfflineReturn {
    isOnline: boolean;
    hasCachedData: boolean;
    pendingSyncCount: number;
    getCachedInterventionsList: () => Promise<any[]>;
    getCachedInterventionById: (id: string) => Promise<any | null>;
    cacheInterventionsList: (interventions: any[]) => Promise<void>;
    syncNow: () => Promise<{ success: number; failed: number }>;
}

export const useOffline = (): UseOfflineReturn => {
    const [online, setOnline] = useState(() => isOnline());
    const [hasCachedData, setHasCachedData] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    useEffect(() => {
        // Enable auto-sync on mount
        enableAutoSync();

        // Check for cached data on mount
        getCachedInterventions().then(cached => {
            setHasCachedData(cached.length > 0);
        }).catch(() => {
            setHasCachedData(false);
        });

        // Check pending sync count
        getPendingSyncActions().then(actions => {
            setPendingSyncCount(actions.length);
        }).catch(() => { });

        // Listen for connection changes
        const cleanup = onConnectionChange((isNowOnline) => {
            setOnline(isNowOnline);
            if (isNowOnline) {
                console.log('Back online! Auto-sync will trigger...');
            } else {
                console.log('Gone offline. Using cached data.');
            }
        });

        // Listen for sync completion
        const handleSyncComplete = (event: CustomEvent) => {
            console.log('Sync completed:', event.detail);
            // Update pending count
            getPendingSyncActions().then(actions => {
                setPendingSyncCount(actions.length);
            }).catch(() => { });
        };

        window.addEventListener('syncComplete', handleSyncComplete as EventListener);

        return () => {
            cleanup();
            window.removeEventListener('syncComplete', handleSyncComplete as EventListener);
        };
    }, []);

    const getCachedInterventionsList = useCallback(async (): Promise<any[]> => {
        return getCachedInterventions();
    }, []);

    const getCachedInterventionById = useCallback(async (id: string): Promise<any | null> => {
        return getCachedIntervention(id);
    }, []);

    const cacheInterventionsList = useCallback(async (interventions: any[]): Promise<void> => {
        await cacheInterventions(interventions);
        setHasCachedData(true);
    }, []);

    const syncNow = useCallback(async (): Promise<{ success: number; failed: number }> => {
        const result = await processSyncQueue();
        // Update pending count after sync
        const actions = await getPendingSyncActions();
        setPendingSyncCount(actions.length);
        return result;
    }, []);

    return {
        isOnline: online,
        hasCachedData,
        pendingSyncCount,
        getCachedInterventionsList,
        getCachedInterventionById,
        cacheInterventionsList,
        syncNow,
    };
};
