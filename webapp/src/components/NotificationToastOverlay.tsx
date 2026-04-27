import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotificationCenter } from "../contexts/NotificationCenterContext";

function getToastMeta(type: "ip_link_disconnected" | "ip_link_restored") {
  return {
    className: type === "ip_link_restored" ? "notification-toast--success" : "notification-toast--danger",
    timeoutMs: 5000,
  };
}

type ToastPhase = "entering" | "visible" | "leaving";

type RenderedToast = {
  id: string;
  title: string;
  message: string;
  link?: string;
  type: "ip_link_disconnected" | "ip_link_restored";
  timeoutMs: number;
  phase: ToastPhase;
};

export function NotificationToastOverlay() {
  const { notifications, markAsRead } = useNotificationCenter();
  const [renderedToasts, setRenderedToasts] = useState<RenderedToast[]>([]);
  const closeTimersRef = useRef<Record<string, number>>({});
  const phaseTimersRef = useRef<Record<string, number>>({});

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).slice(0, 3),
    [notifications]
  );

  useEffect(() => {
    const unreadIds = new Set(unreadNotifications.map((item) => item.id));

    setRenderedToasts((current) => {
      const next = [...current];

      unreadNotifications.forEach((item) => {
        if (next.some((toast) => toast.id === item.id)) {
          return;
        }

        const timeoutMs = getToastMeta(item.type).timeoutMs;

        next.push({
          id: item.id,
          title: item.title,
          message: item.message,
          link: item.link,
          type: item.type,
          timeoutMs,
          phase: "entering",
        });

        phaseTimersRef.current[item.id] = window.setTimeout(() => {
          setRenderedToasts((latest) => latest.map((toast) => (
            toast.id === item.id && toast.phase === "entering"
              ? { ...toast, phase: "visible" }
              : toast
          )));
        }, 40);

        closeTimersRef.current[item.id] = window.setTimeout(() => {
          setRenderedToasts((latest) => latest.map((toast) => (
            toast.id === item.id ? { ...toast, phase: "leaving" } : toast
          )));

          phaseTimersRef.current[item.id] = window.setTimeout(() => {
            markAsRead(item.id);
            setRenderedToasts((latest) => latest.filter((toast) => toast.id !== item.id));
            delete closeTimersRef.current[item.id];
            delete phaseTimersRef.current[item.id];
          }, 260);
        }, timeoutMs);
      });

      return next
        .filter((toast) => unreadIds.has(toast.id) || toast.phase === "leaving")
        .slice(0, 3);
    });
  }, [unreadNotifications]);

  useEffect(() => {
    return () => {
      Object.values(closeTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      Object.values(phaseTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, [markAsRead]);

  if (renderedToasts.length === 0) return null;

  return (
    <div className="notification-toast-stack" aria-live="polite" aria-atomic="true">
      {renderedToasts.map((notification) => (
        notification.link ? (
          <Link
            key={notification.id}
            to={notification.link}
            className={`notification-toast ${getToastMeta(notification.type).className} notification-toast--${notification.phase}`}
            onClick={() => {
              Object.values({
                close: closeTimersRef.current[notification.id],
                phase: phaseTimersRef.current[notification.id],
              }).forEach((timer) => {
                if (timer) window.clearTimeout(timer);
              });
              delete closeTimersRef.current[notification.id];
              delete phaseTimersRef.current[notification.id];
              markAsRead(notification.id);
              setRenderedToasts((current) => current.filter((toast) => toast.id !== notification.id));
            }}
          >
            <div className="notification-toast__accent" />
            <div className="notification-toast__content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <span
                className="notification-toast__progress"
                style={{ animationDuration: `${notification.timeoutMs}ms` }}
                aria-hidden="true"
              />
            </div>
          </Link>
        ) : (
          <div key={notification.id} className={`notification-toast ${getToastMeta(notification.type).className} notification-toast--${notification.phase}`}>
            <div className="notification-toast__accent" />
            <div className="notification-toast__content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <span
                className="notification-toast__progress"
                style={{ animationDuration: `${notification.timeoutMs}ms` }}
                aria-hidden="true"
              />
            </div>
          </div>
        )
      ))}
    </div>
  );
}
