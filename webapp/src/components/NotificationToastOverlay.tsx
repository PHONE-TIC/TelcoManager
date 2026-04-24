import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotificationCenter } from "../contexts/NotificationCenterContext";
function getToastMeta(type: "ip_link_disconnected" | "ip_link_restored") {
  return {
    className: type === "ip_link_restored" ? "notification-toast--success" : "notification-toast--danger",
    timeoutMs: 5000,
  };
}

export function NotificationToastOverlay() {
  const { notifications, markAsRead } = useNotificationCenter();
  const [visibleNotifications, setVisibleNotifications] = useState<Array<{ id: string; timeoutMs: number }>>([]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).slice(0, 3),
    [notifications]
  );

  useEffect(() => {
    const newest = unreadNotifications.map((item) => ({
      id: item.id,
      timeoutMs: getToastMeta(item.type).timeoutMs,
    }));
    setVisibleNotifications(newest);
  }, [unreadNotifications]);

  useEffect(() => {
    if (visibleNotifications.length === 0) return;
    const timers = visibleNotifications.map(({ id, timeoutMs }) =>
      window.setTimeout(() => {
        markAsRead(id);
      }, timeoutMs)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visibleNotifications, markAsRead]);

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="notification-toast-stack" aria-live="polite" aria-atomic="true">
      {unreadNotifications.map((notification) => (
        notification.link ? (
          <Link
            key={notification.id}
            to={notification.link}
            className={`notification-toast ${getToastMeta(notification.type).className}`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="notification-toast__accent" />
            <div className="notification-toast__content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
          </Link>
        ) : (
          <div key={notification.id} className={`notification-toast ${getToastMeta(notification.type).className}`}>
            <div className="notification-toast__accent" />
            <div className="notification-toast__content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
          </div>
        )
      ))}
    </div>
  );
}
