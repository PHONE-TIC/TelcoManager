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
import type { Intervention } from '../types';

type OfflineIntervention = Intervention;

interface UseOfflineReturn {
    isOnline: boolean;
    hasCachedData: boolean;
    pendingSyncCount: number;
    getCachedInterventionsList: () => Promise<OfflineIntervention[]>;
    getCachedInterventionById: (id: string) => Promise<OfflineIntervention | null>;
    cacheInterventionsList: (interventions: OfflineIntervention[]) => Promise<void>;
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
        });

        // Listen for sync completion
        const handleSyncComplete = () => {
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

    const getCachedInterventionsList = useCallback(async (): Promise<OfflineIntervention[]> => {
        return getCachedInterventions();
    }, []);

    const getCachedInterventionById = useCallback(async (id: string): Promise<OfflineIntervention | null> => {
        return getCachedIntervention(id);
    }, []);

    const cacheInterventionsList = useCallback(async (interventions: OfflineIntervention[]): Promise<void> => {
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
