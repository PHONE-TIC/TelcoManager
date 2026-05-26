import { createContext, useContext } from "react";

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

export type NotificationCenterContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  removeNotification: (id: string) => void;
};

export const NotificationCenterContext = createContext<NotificationCenterContextValue | undefined>(undefined);

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  }
  return context;
}
