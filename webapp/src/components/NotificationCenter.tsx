import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotificationCenter } from "../contexts/NotificationCenterContext";

function formatRelativeDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasNotifications = notifications.length > 0;
  const latestUnread = useMemo(() => notifications.find((item) => !item.read), [notifications]);

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        type="button"
        className={`notification-bell ${open ? "is-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Centre de notifications"
      >
        <span className="notification-bell__icon" aria-hidden="true">🔔</span>
        {unreadCount > 0 ? <span className="notification-bell__badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-panel">
          <div className="notification-panel__header">
            <div>
              <div className="notification-panel__title">Notifications</div>
              <div className="notification-panel__subtitle">
                {hasNotifications ? `${notifications.length} alerte(s)` : "Aucune alerte"}
              </div>
            </div>
            <div className="notification-panel__actions">
              {unreadCount > 0 ? (
                <button type="button" className="notification-panel__action" onClick={markAllAsRead}>
                  Tout lire
                </button>
              ) : null}
              {hasNotifications ? (
                <button type="button" className="notification-panel__action notification-panel__action--danger" onClick={clearAll}>
                  Effacer
                </button>
              ) : null}
            </div>
          </div>

          {latestUnread ? (
            <div className="notification-panel__summary">
              <span className="notification-panel__summary-dot" />
              {latestUnread.title}
            </div>
          ) : null}

          <div className="notification-panel__list">
            {hasNotifications ? notifications.map((notification) => (
              <article
                key={notification.id}
                className={`notification-item ${notification.read ? "is-read" : "is-unread"}`}
              >
                <div className="notification-item__body">
                  <div className="notification-item__title-row">
                    <strong>{notification.title}</strong>
                    <span>{formatRelativeDate(notification.createdAt)}</span>
                  </div>
                  <p>{notification.message}</p>
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      className="notification-item__link"
                      onClick={() => {
                        markAsRead(notification.id);
                        setOpen(false);
                      }}
                    >
                      Voir
                    </Link>
                  ) : null}
                </div>
                <div className="notification-item__controls">
                  {!notification.read ? (
                    <button type="button" className="notification-item__button" onClick={() => markAsRead(notification.id)}>
                      Lu
                    </button>
                  ) : null}
                  <button type="button" className="notification-item__button notification-item__button--danger" onClick={() => removeNotification(notification.id)}>
                    ✕
                  </button>
                </div>
              </article>
            )) : (
              <div className="notification-panel__empty">Aucune notification de déconnexion pour le moment.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
