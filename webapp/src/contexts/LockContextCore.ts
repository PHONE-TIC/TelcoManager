import { createContext, useContext } from 'react';

export interface LockInfo {
    lockedBy: string;
    lockedAt: string;
}

export interface LockContextType {
    locks: Record<string, LockInfo>;
}

export const LockContext = createContext<LockContextType>({ locks: {} });

export function useLocks() {
    return useContext(LockContext);
}
