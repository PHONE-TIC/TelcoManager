import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiService } from "../services/api.service";
import { useAuth } from "./useAuth";
import {
  NotificationCenterContext,
  type AppNotification,
} from "./NotificationCenterContextCore";

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { user } = useAuth();
  const userId = user?.id;

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [userId]);

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
    let timer: number | undefined;
    if (userId) {
      timer = window.setTimeout(() => {
        void refreshNotifications();
      }, 0);
    } else {
      // Clear notifications asynchronously to avoid synchronous setState inside effect
      timer = window.setTimeout(() => {
        setNotifications([]);
      }, 0);
    }
    return () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [userId, refreshNotifications]);

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
