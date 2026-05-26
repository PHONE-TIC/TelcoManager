import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/useAuth";
import { useNotificationCenter } from "../contexts/NotificationCenterContextCore";

export function IpLinksNotificationWatcher() {
  const { user } = useAuth();
  const { refreshNotifications } = useNotificationCenter();
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "gestionnaire")) {
      return;
    }

    // Récupérer les notifications immédiatement au montage
    void refreshNotifications();

    // Actualiser les notifications toutes les 15 secondes pour synchroniser l'affichage
    pollingRef.current = window.setInterval(() => {
      void refreshNotifications();
    }, 15000);

    return () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user, refreshNotifications]);

  return null;
}
