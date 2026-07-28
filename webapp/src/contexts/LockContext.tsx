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

        let eventSource: EventSource | null = null;
        let cancelled = false;

        // EventSource ne permet pas d'émettre d'en-tête Authorization : le jeton
        // devrait alors transiter dans l'URL, où il serait exposé aux journaux
        // d'accès du proxy et à l'historique du navigateur. On échange donc le
        // jeton de session contre un ticket à durée de vie très courte, qui
        // n'ouvre que ce flux.
        const openStream = async () => {
            let ticket: string;
            try {
                const response = await fetch('/api/auth/stream-ticket', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) {
                    console.error('Impossible d\'obtenir un ticket de flux:', response.status);
                    return;
                }
                ticket = (await response.json()).ticket;
            } catch (err) {
                console.error('Impossible d\'obtenir un ticket de flux:', err);
                return;
            }

            if (cancelled) return;

            const sseUrl = `/api/interventions/locks/stream?ticket=${encodeURIComponent(ticket)}`;
            eventSource = new EventSource(sseUrl);
            attachHandlers(eventSource);
        };

        const attachHandlers = (source: EventSource) => {
            source.onmessage = (event) => {
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

            source.onerror = (err) => {
                console.error('SSE lock connection error:', err);
            };
        };

        openStream();

        return () => {
            cancelled = true;
            eventSource?.close();
        };
    }, [user]);

    return (
        <LockContext.Provider value={{ locks }}>
            {children}
        </LockContext.Provider>
    );
}
