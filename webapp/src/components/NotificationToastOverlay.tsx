import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotificationCenter } from "../contexts/NotificationCenterContext";

export function NotificationToastOverlay() {
  const { notifications, markAsRead } = useNotificationCenter();
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).slice(0, 3),
    [notifications]
  );

  useEffect(() => {
    const newestIds = unreadNotifications.map((item) => item.id);
    setVisibleIds(newestIds);
  }, [unreadNotifications]);

  useEffect(() => {
    if (visibleIds.length === 0) return;
    const timers = visibleIds.map((id) =>
      window.setTimeout(() => {
        markAsRead(id);
      }, 8000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visibleIds, markAsRead]);

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="notification-toast-stack" aria-live="polite" aria-atomic="true">
      {unreadNotifications.map((notification) => (
        <div key={notification.id} className="notification-toast">
          <div className="notification-toast__accent" />
          <div className="notification-toast__content">
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
            <div className="notification-toast__actions">
              {notification.link ? (
                <Link to={notification.link} className="notification-toast__link" onClick={() => markAsRead(notification.id)}>
                  Ouvrir
                </Link>
              ) : null}
              <button type="button" className="notification-toast__dismiss" onClick={() => markAsRead(notification.id)}>
                Ignorer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
