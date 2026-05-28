import { Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import { getTechnicianStockWhere } from "./technician-stock.controller.helpers";
import {
  addTechnicianStockItem,
  assignTechnicianStockToClient,
  removeTechnicianStockItem,
  retrieveTechnicianStockFromClient,
  transferHsTechnicianStockToGeneralStock,
  updateTechnicianStockItem,
} from "../services/technician-stock.service";

/**
 * Vérifie si l'utilisateur connecté a le droit d'accéder/modifier le stock du technicien spécifié.
 * Règle : Admin/Gestionnaire peuvent tout faire, un Technicien ne peut gérer que son propre véhicule.
 */
const checkTechnicianStockAccess = (req: AuthRequest, res: Response, targetTechnicienId: string): boolean => {
  if (!req.user) {
    res.status(401).json({ error: "Non authentifié" });
    return false;
  }
  if (req.user.role !== "admin" && req.user.role !== "gestionnaire" && req.user.id !== targetTechnicienId) {
    res.status(403).json({ error: "Accès refusé - Vous n'êtes pas autorisé à gérer le stock de ce technicien" });
    return false;
  }
  return true;
};

// Obtenir le stock du véhicule d'un technicien
export const getTechnicianStock = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId } = req.params;

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    const vehicleStock = await prisma.technicianStock.findMany({
      where: { technicienId },
      include: {
        stock: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(vehicleStock);
  } catch (error) {
    console.error("Erreur getTechnicianStock:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération du stock véhicule" });
  }
};

// Ajouter un matériel au véhicule
export const addItemToVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId } = req.params;

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    const result = await addTechnicianStockItem({
      technicienId,
      stockId: req.body.stockId,
      quantite: req.body.quantite,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur addItemToVehicle:", error);
    return res
      .status(500)
      .json({ error: "Erreur lors de l'ajout du matériel au véhicule" });
  }
};

// Mettre à jour la quantité d'un matériel dans le véhicule
export const updateItemQuantity = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;
    const { quantite, etat } = req.body;

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    if (quantite === undefined || quantite === null) {
      return res.status(400).json({ error: "quantite est requis" });
    }

    const result = await updateTechnicianStockItem({
      technicienId,
      stockId,
      quantite,
      etat,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur updateItemQuantity:", error);
    return res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de la quantité" });
  }
};

// Retirer un matériel du véhicule
export const removeItemFromVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    const result = await removeTechnicianStockItem({
      technicienId,
      stockId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur removeItemFromVehicle:", error);
    return res.status(500).json({ error: "Erreur lors du retrait du matériel" });
  }
};

// Assigner un matériel à un client
export const assignToClient = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    const result = await assignTechnicianStockToClient({
      technicienId,
      stockId,
      clientId: req.body.clientId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur assignToClient:", error);
    return res.status(500).json({ error: "Erreur lors de l'assignation au client" });
  }
};

// Reprendre un matériel d'un client
export const retrieveFromClient = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    const result = await retrieveTechnicianStockFromClient({
      technicienId,
      stockId,
      etat: req.body.etat,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur retrieveFromClient:", error);
    return res.status(500).json({ error: "Erreur lors de la reprise du matériel" });
  }
};

// Transférer stock HS technicien vers stock HS général (Admin uniquement)
export const transferHsToGeneralStock = async (req: AuthRequest, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    // Strictement réservé aux administrateurs
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé - Administrateur requis" });
    }

    if (!checkTechnicianStockAccess(req, res, technicienId)) return;

    const result = await transferHsTechnicianStockToGeneralStock({
      technicienId,
      stockId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur transferHsToGeneralStock:", error);
    return res.status(500).json({ error: "Erreur lors du transfert vers stock HS" });
  }
};
