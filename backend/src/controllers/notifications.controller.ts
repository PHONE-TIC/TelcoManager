import { Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

// Récupérer les 50 dernières notifications (filtrées par rôle pour les techniciens)
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "technicien") {
      // Le destinataire est filtré directement en base, sur le champ JSON
      // metadata. Le filtrage se faisait auparavant en mémoire sur les 200
      // dernières notifications tous techniciens confondus : au-delà de ce
      // volume, un technicien cessait de voir les siennes — les notifications
      // de ses collègues saturant la fenêtre.
      const notifications = await prisma.notification.findMany({
        where: {
          type: "new_intervention",
          metadata: {
            path: ["technicienId"],
            equals: userId,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return res.json(notifications);
    } else {
      // Pour les admins et gestionnaires, on renvoie toutes les notifications (liens IP) sauf les attributions destinées aux techniciens
      const notifications = await prisma.notification.findMany({
        where: {
          type: {
            not: "new_intervention",
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return res.json(notifications);
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ error: "Erreur lors de la récupération des notifications" });
  }
};

// Marquer une notification spécifique comme lue (vérification de permission pour le technicien)
export const markAsRead = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userRole = req.user?.role;
  const userId = req.user?.id;

  try {
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Notification non trouvée" });
    }

    if (userRole === "technicien") {
      const metadata = existing.metadata as any;
      if (!metadata || metadata.technicienId !== userId) {
        return res.status(403).json({ error: "Accès interdit - Cette notification ne vous est pas assignée" });
      }
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ error: "Erreur lors de la modification de la notification" });
  }
};

// Marquer toutes les notifications comme lues (par rôle pour les techniciens)
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "technicien") {
      const unreadNotifications = await prisma.notification.findMany({
        where: {
          type: "new_intervention",
          read: false,
        },
      });

      const userUnreadIds = unreadNotifications
        .filter((n) => {
          const metadata = n.metadata as any;
          return metadata && metadata.technicienId === userId;
        })
        .map((n) => n.id);

      if (userUnreadIds.length > 0) {
        await prisma.notification.updateMany({
          where: {
            id: { in: userUnreadIds },
          },
          data: { read: true },
        });
      }
    } else {
      await prisma.notification.updateMany({
        where: {
          read: false,
          type: {
            not: "new_intervention",
          },
        },
        data: { read: true },
      });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ error: "Erreur lors de la modification des notifications" });
  }
};

// Supprimer tout l'historique des notifications (par rôle pour les techniciens)
export const clearAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === "technicien") {
      const allNotifications = await prisma.notification.findMany({
        where: { type: "new_intervention" },
      });

      const userNotificationIds = allNotifications
        .filter((n) => {
          const metadata = n.metadata as any;
          return metadata && metadata.technicienId === userId;
        })
        .map((n) => n.id);

      if (userNotificationIds.length > 0) {
        await prisma.notification.deleteMany({
          where: { id: { in: userNotificationIds } },
        });
      }
    } else {
      await prisma.notification.deleteMany({
        where: {
          type: {
            not: "new_intervention",
          },
        },
      });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression des notifications" });
  }
};
