import React, { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { LockContext, type LockInfo } from './LockContextCore';

interface SseLockItem {
    interventionId: string;
    lockedBy: string;
    lockedAt: string;
}

export function LockProvider({ children }: { children: React.ReactNode }) {
    const [locks, setLocks] = useState<Record<string, LockInfo>>({});
    const { user } = useAuth();

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (!user || !token) {
            // Avoid calling setState synchronously within the effect body to prevent cascading renders
            const timer = setTimeout(() => {
                setLocks({});
            }, 0);
            return () => clearTimeout(timer);
        }

        const sseUrl = `/api/interventions/locks/stream?token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'initial') {
                    const newLocks: Record<string, LockInfo> = {};
                    data.locks.forEach((lock: SseLockItem) => {
                        newLocks[lock.interventionId] = {
                            lockedBy: lock.lockedBy,
                            lockedAt: lock.lockedAt,
                        };
                    });
                    setLocks(newLocks);
                } else if (data.type === 'update') {
                    setLocks((prev) => {
                        const updated = { ...prev };
                        if (data.lockedBy === null) {
                            delete updated[data.interventionId];
                        } else {
                            updated[data.interventionId] = {
                                lockedBy: data.lockedBy,
                                lockedAt: data.lockedAt,
                            };
                        }
                        return updated;
                    });
                }
            } catch (err) {
                console.error('SSE lock parse error:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE lock connection error:', err);
        };

        return () => {
            eventSource.close();
        };
    }, [user]);

    return (
        <LockContext.Provider value={{ locks }}>
            {children}
        </LockContext.Provider>
    );
}
