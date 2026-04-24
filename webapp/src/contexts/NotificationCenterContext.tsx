import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type AppNotification = {
  id: string;
  type: "ip_link_disconnected" | "ip_link_restored";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
};

type NotificationCenterContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
};

const STORAGE_KEY = "telcomanager-notification-center";
const NotificationCenterContext = createContext<NotificationCenterContextValue | undefined>(undefined);

function loadInitialNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadInitialNotifications);
  const duplicateGuardRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    const dedupeKey = JSON.stringify({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
    });
    const now = Date.now();
    const lastSeen = duplicateGuardRef.current.get(dedupeKey);
    if (lastSeen && now - lastSeen < 15000) {
      return;
    }
    duplicateGuardRef.current.set(dedupeKey, now);

    setNotifications((current) => [
      {
        ...notification,
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date(now).toISOString(),
        read: false,
      },
      ...current,
    ].slice(0, 50));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  }), [notifications, addNotification, markAsRead, markAllAsRead, clearAll, removeNotification]);

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  }
  return context;
}
