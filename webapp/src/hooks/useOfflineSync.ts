import { useEffect, useState, useCallback } from 'react';
import { getOfflineQueue, syncOfflineClosures } from '../utils/offlineSync';

export function useOfflineSync() {
    const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueue().length);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const refreshQueueCount = useCallback(() => {
        setQueueCount(getOfflineQueue().length);
    }, []);

    const triggerSync = useCallback(async () => {
        const queue = getOfflineQueue();
        if (queue.length === 0 || isSyncing) return;

        setIsSyncing(true);
        setSyncMessage(`Réseau détecté. Synchronisation de ${queue.length} clôture(s) en cours...`);

        try {
            const result = await syncOfflineClosures((msg) => {
                setSyncMessage(msg);
            });

            if (result.successCount > 0) {
                // Show a successful synchronization message
                const total = result.successCount + result.errorCount;
                setSyncMessage(
                    `Synchronisation terminée : ${result.successCount}/${total} intervention(s) clôturée(s) avec succès !`
                );
                // Clear the message after a delay
                setTimeout(() => {
                    setSyncMessage(null);
                }, 5000);
            } else if (result.errorCount > 0) {
                setSyncMessage(`Échec de la synchronisation. Les interventions restent en attente du réseau.`);
                setTimeout(() => {
                    setSyncMessage(null);
                }, 5000);
            } else {
                setSyncMessage(null);
            }
        } catch (error) {
            console.error('Offline synchronization error:', error);
            setSyncMessage('Erreur lors de la synchronisation automatique.');
            setTimeout(() => {
                setSyncMessage(null);
            }, 5000);
        } finally {
            setIsSyncing(false);
            refreshQueueCount();
        }
    }, [isSyncing, refreshQueueCount]);

    // Handle online event
    useEffect(() => {
        const handleOnline = () => {
            console.log('App came online. Triggering synchronization...');
            triggerSync();
        };

        const handleOffline = () => {
            console.log('App went offline.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Run sync on mount if online
        if (navigator.onLine) {
            triggerSync();
        }

        // Periodically refresh queue count in case it changes elsewhere
        const interval = setInterval(refreshQueueCount, 3000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [triggerSync, refreshQueueCount]);

    return {
        queueCount,
        isSyncing,
        syncMessage,
        triggerSync,
        refreshQueueCount
    };
}
