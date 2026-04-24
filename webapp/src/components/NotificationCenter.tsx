import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { useNotificationCenter } from "../contexts/NotificationCenterContext";
import { AppIcon } from "./AppIcon";

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
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsClosing(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!isClosing) return;
    const timeout = window.setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [isClosing]);

  const closePanel = () => {
    setIsClosing(true);
  };

  const hasNotifications = notifications.length > 0;
  const latestUnread = useMemo(() => notifications.find((item) => !item.read), [notifications]);

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        type="button"
        className={`notification-bell ${open ? "is-open" : ""}`}
        onClick={() => {
          if (open) {
            closePanel();
            return;
          }
          setIsClosing(false);
          setOpen(true);
        }}
        aria-label="Centre de notifications"
      >
        <span className="notification-bell__icon" aria-hidden="true"><AppIcon name="bell" size={24} /></span>
        {unreadCount > 0 ? <span className="notification-bell__badge">{unreadCount}</span> : null}
      </button>

      {open ? ReactDOM.createPortal(
        <div className={`notification-overlay ${isClosing ? "closing" : ""}`} onClick={closePanel}>
          <div
            ref={panelRef}
            className={`notification-panel notification-panel--portal ${isClosing ? "closing" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notification-panel__header">
              <div>
                <div className="notification-panel__title">Notifications</div>
                <div className="notification-panel__subtitle">
                  {hasNotifications ? `${notifications.length} notification(s)` : "Aucune notification"}
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
                <button
                  type="button"
                  className="notification-panel__close"
                  onClick={closePanel}
                  aria-label="Fermer le centre de notifications"
                >
                  <AppIcon name="close" size={18} />
                </button>
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
                          closePanel();
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
                      <AppIcon name="close" size={16} />
                    </button>
                  </div>
                </article>
              )) : (
                <div className="notification-panel__empty">Aucune notification pour le moment.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
