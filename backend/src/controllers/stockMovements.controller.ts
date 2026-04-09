import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  getAllStockMovementList,
  getStockMovementList,
} from "../services/stock-movement-query.service";
import {
  bulkImportStockItems,
  bulkTransferStockItems,
  createStockMovement,
  transferStockToTechnician,
} from "../services/stock-movement-write.service";

function getAuthenticatedUserId(req: AuthRequest) {
  return req.user!.id;
}

function hasImportItems(items: unknown): items is Array<Record<string, unknown>> {
  return Array.isArray(items) && items.length > 0;
}

function hasTransferItems(
  items: unknown
): items is Array<{ stockId: string; quantite: number; status?: "ok" | "hs" }> {
  return Array.isArray(items) && items.length > 0;
}

// Get movements for a specific stock item
export const getStockMovements = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getStockMovementList({
      stockId: req.params.id,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    res.json(result);
  } catch (error) {
    console.error("Erreur récupération mouvements stock:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Get all movements (for dashboard/reports)
export const getAllMovements = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllStockMovementList({
      limit: req.query.limit,
      offset: req.query.offset,
      type: req.query.type,
      stockId: req.query.stockId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    res.json(result);
  } catch (error) {
    console.error("Erreur récupération tous mouvements:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Create a stock movement (internal helper, also exported for use in other controllers)
export const createMovement = createStockMovement;

// Transfer stock to technician
export const transferToTechnician = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { technicienId, quantite, reason } = req.body;
    const performedById = getAuthenticatedUserId(req);

    if (!technicienId || !quantite || quantite <= 0) {
      return res.status(400).json({ error: "Technicien et quantité requis" });
    }

    const result = await transferStockToTechnician({
      stockId: id,
      technicienId,
      quantite,
      reason,
      performedById,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur transfert stock:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

// Bulk import stock items
export const bulkImportStock = async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;
    const performedById = getAuthenticatedUserId(req);

    if (!hasImportItems(items)) {
      return res.status(400).json({ error: "Liste d'articles requise" });
    }

    const results = await bulkImportStockItems({ items, performedById });

    res.json({
      message: `Import terminé: ${results.created} articles créés`,
      ...results,
    });
  } catch (error) {
    console.error("Erreur import stock:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Bulk transfer stock
export const bulkTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const { sourceType, sourceId, destType, destId, items } = req.body;
    const performedById = getAuthenticatedUserId(req);

    if (!hasTransferItems(items)) {
      return res.status(400).json({ error: "Liste d'articles requise" });
    }

    if (
      !["warehouse", "technician"].includes(sourceType) ||
      !["warehouse", "technician"].includes(destType)
    ) {
      return res
        .status(400)
        .json({ error: "Type de source ou destination invalide" });
    }
    if (sourceType === destType && sourceType === "warehouse") {
      return res
        .status(400)
        .json({ error: "Transfert Entrepôt vers Entrepôt inutile" });
    }
    if (sourceType === "technician" && !sourceId) {
      return res.status(400).json({ error: "Source ID requis" });
    }
    if (destType === "technician" && !destId) {
      return res.status(400).json({ error: "Destination ID requis" });
    }

    const results = await bulkTransferStockItems({
      sourceType,
      sourceId,
      destType,
      destId,
      items,
      performedById,
    });

    res.json({
      message: "Transfert effectué avec succès",
      count: results.length,
    });
  } catch (error: any) {
    console.error("Erreur bulk transfer:", error);
    res
      .status(500)
      .json({ error: error.message || "Erreur lors du transfert" });
  }
};
