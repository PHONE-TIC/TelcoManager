import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/useAuth";
import { useNotificationCenter } from "../contexts/NotificationCenterContext";
import { useNotifications } from "../hooks/useNotifications";
import { apiService } from "../services/api.service";
import {
  showIpLinkDisconnectedNotification,
  showIpLinkRestoredNotification,
} from "../services/notification.service";
import type { IpLink } from "../types";

type KnownStatus = IpLink["healthStatus"];

type StoredStatuses = Record<string, KnownStatus>;

const STORAGE_KEY = "telcomanager-ip-links-known-statuses";

function readStoredStatuses(): StoredStatuses {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as StoredStatuses : {};
  } catch {
    return {};
  }
}

function writeStoredStatuses(statuses: StoredStatuses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

export function IpLinksNotificationWatcher() {
  const { user } = useAuth();
  const { addNotification } = useNotificationCenter();
  const { isEnabled } = useNotifications();
  const initializedRef = useRef(false);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "gestionnaire")) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const snapshot = await apiService.getIpLinks();
        if (cancelled) return;

        const items: IpLink[] = snapshot.items || [];
        const nextStatuses: StoredStatuses = Object.fromEntries(
          items.map((link) => [String(link.id), link.healthStatus])
        );
        const previousStatuses = readStoredStatuses();

        if (!initializedRef.current) {
          writeStoredStatuses(nextStatuses);
          initializedRef.current = true;
          return;
        }

        items.forEach((link) => {
          const previousStatus = previousStatuses[String(link.id)];
          const currentStatus = link.healthStatus;
          const linkPath = `/supervision-liens-ip/${encodeURIComponent(link.reference)}`;

          if (!previousStatus || previousStatus === currentStatus) {
            return;
          }

          if (currentStatus === "disconnected") {
            const title = "Lien déconnecté";
            const message = `${link.clientName} • ${link.reference}`;

            addNotification({
              type: "ip_link_disconnected",
              title,
              message,
              link: linkPath,
              metadata: {
                linkId: link.id,
                reference: link.reference,
                clientName: link.clientName,
              },
            });

            if (isEnabled) {
              showIpLinkDisconnectedNotification({
                type: "ip_link_disconnected",
                linkId: link.id,
                reference: link.reference,
                clientName: link.clientName,
                title,
                message,
                url: linkPath,
              });
            }
          }

          if (previousStatus === "disconnected" && currentStatus === "connected") {
            const title = "Lien connecté";
            const message = `${link.clientName} • ${link.reference}`;

            addNotification({
              type: "ip_link_restored",
              title,
              message,
              link: linkPath,
              metadata: {
                linkId: link.id,
                reference: link.reference,
                clientName: link.clientName,
              },
            });

            if (isEnabled) {
              showIpLinkRestoredNotification({
                type: "ip_link_restored",
                linkId: link.id,
                reference: link.reference,
                clientName: link.clientName,
                title,
                message,
                url: linkPath,
              });
            }
          }
        });

        writeStoredStatuses(nextStatuses);
      } catch (error) {
        console.error("Erreur surveillance notifications liens IP:", error);
      }
    };

    void poll();
    pollingRef.current = window.setInterval(() => {
      void poll();
    }, 30000);

    return () => {
      cancelled = true;
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user, addNotification, isEnabled]);

  return null;
}
