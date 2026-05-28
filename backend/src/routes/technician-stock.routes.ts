import { Router } from "express";
import { body, param } from "express-validator";
import * as technicianStockController from "../controllers/technician-stock.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/technician-stock/:technicienId - Obtenir le stock du véhicule d'un technicien
router.get(
  "/:technicienId",
  [param("technicienId").isUUID()],
  technicianStockController.getTechnicianStock
);

// POST /api/technician-stock/:technicienId - Ajouter un matériel au véhicule
router.post(
  "/:technicienId",
  [
    param("technicienId").isUUID(),
    body("stockId").isUUID().withMessage("stockId invalide"),
    body("quantite").optional().isInt({ min: 1 }).toInt().withMessage("Quantité invalide"),
  ],
  technicianStockController.addItemToVehicle
);

// PUT /api/technician-stock/:technicienId/:stockId - Mettre à jour la quantité
router.put(
  "/:technicienId/:stockId",
  [
    param("technicienId").isUUID(),
    param("stockId").isUUID(),
    body("quantite").isInt({ min: 0 }).toInt().withMessage("Quantité invalide"),
  ],
  technicianStockController.updateItemQuantity
);

// DELETE /api/technician-stock/:technicienId/:stockId - Retirer un matériel du véhicule
router.delete(
  "/:technicienId/:stockId",
  [
    param("technicienId").isUUID(),
    param("stockId").isUUID(),
  ],
  technicianStockController.removeItemFromVehicle
);

// POST /api/technician-stock/:technicienId/:stockId/assign - Assigner à un client
router.post(
  "/:technicienId/:stockId/assign",
  [
    param("technicienId").isUUID(),
    param("stockId").isUUID(),
    body("clientId").isUUID().withMessage("clientId invalide"),
  ],
  technicianStockController.assignToClient
);

// POST /api/technician-stock/:technicienId/:stockId/retrieve - Reprendre d'un client
router.post(
  "/:technicienId/:stockId/retrieve",
  [
    param("technicienId").isUUID(),
    param("stockId").isUUID(),
    body("etat").isIn(["ok", "hs"]).withMessage("etat invalide"),
  ],
  technicianStockController.retrieveFromClient
);

// POST /api/technician-stock/:technicienId/:stockId/transfer-hs - Transférer vers stock HS général
router.post(
  "/:technicienId/:stockId/transfer-hs",
  [
    param("technicienId").isUUID(),
    param("stockId").isUUID(),
  ],
  technicianStockController.transferHsToGeneralStock
);

export default router;
