import { Request, Response } from "express";
import { prisma } from "../index";
import { getTechnicianStockWhere } from "./technician-stock.controller.helpers";
import {
  addTechnicianStockItem,
  assignTechnicianStockToClient,
  retrieveTechnicianStockFromClient,
  transferHsTechnicianStockToGeneralStock,
  updateTechnicianStockItem,
} from "../services/technician-stock.service";

// Obtenir le stock du véhicule d'un technicien
export const getTechnicianStock = async (req: Request, res: Response) => {
  try {
    const { technicienId } = req.params;

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
export const addItemToVehicle = async (req: Request, res: Response) => {
  try {
    const result = await addTechnicianStockItem({
      technicienId: req.params.technicienId,
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
export const updateItemQuantity = async (req: Request, res: Response) => {
  try {
    const { quantite, etat } = req.body;

    if (quantite === undefined || quantite === null) {
      return res.status(400).json({ error: "quantite est requis" });
    }

    const result = await updateTechnicianStockItem({
      technicienId: req.params.technicienId,
      stockId: req.params.stockId,
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
export const removeItemFromVehicle = async (req: Request, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    await prisma.technicianStock.delete({
      where: getTechnicianStockWhere(technicienId, stockId),
    });

    res.json({ message: "Matériel retiré du véhicule avec succès" });
  } catch (error) {
    console.error("Erreur removeItemFromVehicle:", error);
    res.status(500).json({ error: "Erreur lors du retrait du matériel" });
  }
};

// Assigner un matériel à un client
export const assignToClient = async (req: Request, res: Response) => {
  try {
    const result = await assignTechnicianStockToClient({
      technicienId: req.params.technicienId,
      stockId: req.params.stockId,
      clientId: req.body.clientId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur assignToClient:", error);
    return res.status(500).json({ error: "Erreur lors de l'assignation au client" });
  }
};

// Reprendre un matériel d'un client
export const retrieveFromClient = async (req: Request, res: Response) => {
  try {
    const result = await retrieveTechnicianStockFromClient({
      technicienId: req.params.technicienId,
      stockId: req.params.stockId,
      etat: req.body.etat,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur retrieveFromClient:", error);
    return res.status(500).json({ error: "Erreur lors de la reprise du matériel" });
  }
};

// Transférer stock HS technicien vers stock HS général (Admin uniquement)
export const transferHsToGeneralStock = async (req: Request, res: Response) => {
  try {
    const result = await transferHsTechnicianStockToGeneralStock({
      technicienId: req.params.technicienId,
      stockId: req.params.stockId,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Erreur transferHsToGeneralStock:", error);
    return res.status(500).json({ error: "Erreur lors du transfert vers stock HS" });
  }
};
