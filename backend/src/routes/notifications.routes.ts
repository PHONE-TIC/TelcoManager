import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Toutes les routes de notifications nécessitent une authentification
router.use(authenticate);

// Récupérer toutes les notifications
router.get("/", notificationsController.getNotifications);

// Marquer une notification comme lue
router.patch("/:id/read", notificationsController.markAsRead);

// Marquer toutes les notifications comme lues
router.post("/mark-all-read", notificationsController.markAllAsRead);

// Vider l'historique des notifications
router.delete("/", notificationsController.clearAllNotifications);

export default router;
