import { Router } from "express";
import {
  authenticate,
  requireGestionnaireOrAdmin,
} from "../middleware/auth.middleware";
import {
  getStockMovements,
  getAllMovements,
  transferToTechnician,
  bulkImportStock,
  bulkTransfer,
} from "../controllers/stockMovements.controller";

const router = Router();

// Get movements for a specific stock item
router.get(
  "/stock/:id/movements",
  authenticate,
  requireGestionnaireOrAdmin,
  getStockMovements
);

// Get all movements (dashboard/reports)
router.get(
  "/stock-movements",
  authenticate,
  requireGestionnaireOrAdmin,
  getAllMovements
);

// Transfer stock to technician
router.post(
  "/stock/:id/transfer",
  authenticate,
  requireGestionnaireOrAdmin,
  transferToTechnician
);

// Bulk transfer
router.post(
  "/stock-movements/bulk-transfer",
  authenticate,
  requireGestionnaireOrAdmin,
  bulkTransfer
);

// Bulk import stock items
router.post(
  "/stock/import",
  authenticate,
  requireGestionnaireOrAdmin,
  bulkImportStock
);

export default router;
