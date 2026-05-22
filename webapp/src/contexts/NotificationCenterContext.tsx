import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiService } from "../services/api.service";
import { useAuth } from "./useAuth";

export type AppNotification = {
  id: string;
  type: "ip_link_disconnected" | "ip_link_restored" | "new_intervention";
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
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  removeNotification: (id: string) => void;
};

const NotificationCenterContext = createContext<NotificationCenterContextValue | undefined>(undefined);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [user]);

  // Keep addNotification for compatibility with watchers (local append only)
  const addNotification = useCallback((notification: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    const now = Date.now();
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

  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, refreshNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    try {
      await apiService.markNotificationAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    try {
      await apiService.markAllNotificationsAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    try {
      await apiService.clearAllNotifications();
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    refreshNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  }), [notifications, refreshNotifications, addNotification, markAsRead, markAllAsRead, clearAll, removeNotification]);

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  }
  return context;
}
