import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface LockInfo {
    lockedBy: string;
    lockedAt: string;
}

interface LockContextType {
    locks: Record<string, LockInfo>;
}

const LockContext = createContext<LockContextType>({ locks: {} });

export function LockProvider({ children }: { children: React.ReactNode }) {
    const [locks, setLocks] = useState<Record<string, LockInfo>>({});
    const { user } = useAuth();

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (!user || !token) {
            setLocks({});
            return;
        }

        const sseUrl = `/api/interventions/locks/stream?token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'initial') {
                    const newLocks: Record<string, LockInfo> = {};
                    data.locks.forEach((lock: any) => {
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

export function useLocks() {
    return useContext(LockContext);
}
