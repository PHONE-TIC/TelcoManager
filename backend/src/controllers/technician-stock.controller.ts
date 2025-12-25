import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    const { technicienId } = req.params;
    const { stockId, quantite } = req.body;

    if (!stockId) {
      return res.status(400).json({ error: "stockId est requis" });
    }

    // Vérifier si le matériel existe déjà dans le véhicule
    const existing = await prisma.technicianStock.findUnique({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
    });

    if (existing) {
      // Mettre à jour la quantité si le matériel existe déjà
      const updated = await prisma.technicianStock.update({
        where: {
          technicienId_stockId: {
            technicienId,
            stockId,
          },
        },
        data: {
          quantite: existing.quantite + (quantite || 1),
        },
        include: {
          stock: true,
        },
      });
      return res.json(updated);
    }

    // Créer un nouvel élément
    const vehicleItem = await prisma.technicianStock.create({
      data: {
        technicienId,
        stockId,
        quantite: quantite || 1,
      },
      include: {
        stock: true,
      },
    });

    res.status(201).json(vehicleItem);
  } catch (error) {
    console.error("Erreur addItemToVehicle:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de l'ajout du matériel au véhicule" });
  }
};

// Mettre à jour la quantité d'un matériel dans le véhicule
export const updateItemQuantity = async (req: Request, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;
    const { quantite, etat } = req.body;

    if (quantite === undefined || quantite === null) {
      return res.status(400).json({ error: "quantite est requis" });
    }

    // Si quantité <= 0, supprimer l'élément
    if (quantite <= 0) {
      await prisma.technicianStock.delete({
        where: {
          technicienId_stockId: {
            technicienId,
            stockId,
          },
        },
      });
      return res.json({ message: "Matériel retiré du véhicule" });
    }

    // Mettre à jour la quantité et/ou l'état
    const updated = await prisma.technicianStock.update({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
      data: {
        quantite,
        ...(etat && { etat }),
      },
      include: {
        stock: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur updateItemQuantity:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de la quantité" });
  }
};

// Retirer un matériel du véhicule
export const removeItemFromVehicle = async (req: Request, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    await prisma.technicianStock.delete({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
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
    const { technicienId, stockId } = req.params;
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: "clientId est requis" });
    }

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ error: "Client non trouvé" });
    }

    // Mettre à jour le TechnicianStock avec le client assigné
    const updated = await prisma.technicianStock.update({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
      data: {
        clientId,
        assignedAt: new Date(),
      },
      include: {
        stock: true,
        client: true,
      },
    });

    // Logger le mouvement
    await prisma.stockMovement.create({
      data: {
        stockId,
        type: "sortie",
        quantite: -1,
        quantiteAvant: 1,
        quantiteApres: 0,
        reason: `Assigné au client: ${client.nom}`,
        technicienId,
        performedById: technicienId,
      },
    });

    res.json({ message: "Matériel assigné au client", item: updated });
  } catch (error) {
    console.error("Erreur assignToClient:", error);
    res.status(500).json({ error: "Erreur lors de l'assignation au client" });
  }
};

// Reprendre un matériel d'un client
export const retrieveFromClient = async (req: Request, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;
    const { etat } = req.body; // "ok" ou "hs"

    if (!etat || !["ok", "hs"].includes(etat)) {
      return res.status(400).json({ error: "etat doit être 'ok' ou 'hs'" });
    }

    // Récupérer l'item actuel pour logger le mouvement
    const current = await prisma.technicianStock.findUnique({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
      include: { client: true, stock: true },
    });

    if (!current) {
      return res
        .status(404)
        .json({ error: "Article non trouvé dans le stock technicien" });
    }

    const clientNom = current.client?.nom || "Client inconnu";

    // Mettre à jour: enlever l'assignation client, mettre l'état
    const updated = await prisma.technicianStock.update({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
      data: {
        clientId: null,
        assignedAt: null,
        etat,
      },
      include: {
        stock: true,
      },
    });

    // Logger le mouvement
    await prisma.stockMovement.create({
      data: {
        stockId,
        type: "entree",
        quantite: 1,
        quantiteAvant: 0,
        quantiteApres: 1,
        reason: `Repris du client: ${clientNom} (état: ${etat.toUpperCase()})`,
        technicienId,
        performedById: technicienId,
      },
    });

    res.json({
      message: `Matériel repris en état ${etat.toUpperCase()}`,
      item: updated,
    });
  } catch (error) {
    console.error("Erreur retrieveFromClient:", error);
    res.status(500).json({ error: "Erreur lors de la reprise du matériel" });
  }
};

// Transférer stock HS technicien vers stock HS général (Admin uniquement)
export const transferHsToGeneralStock = async (req: Request, res: Response) => {
  try {
    const { technicienId, stockId } = req.params;

    // Vérifier que l'item existe et est HS
    const item = await prisma.technicianStock.findUnique({
      where: {
        technicienId_stockId: {
          technicienId,
          stockId,
        },
      },
      include: { stock: true, technicien: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Article non trouvé" });
    }

    if (item.etat !== "hs") {
      return res
        .status(400)
        .json({ error: "Seul le matériel HS peut être transféré" });
    }

    // Transaction: supprimer du stock technicien et mettre le stock principal en HS
    await prisma.$transaction(async (tx) => {
      // Supprimer du stock technicien
      await tx.technicianStock.delete({
        where: {
          technicienId_stockId: {
            technicienId,
            stockId,
          },
        },
      });

      // Passer le stock principal en statut HS
      await tx.stock.update({
        where: { id: stockId },
        data: { statut: "hs" },
      });

      // Logger le mouvement
      await tx.stockMovement.create({
        data: {
          stockId,
          type: "hs",
          quantite: -1,
          quantiteAvant: 1,
          quantiteApres: 0,
          reason: `Transféré vers stock HS général depuis véhicule ${item.technicien.nom}`,
          technicienId,
          performedById: technicienId,
        },
      });
    });

    res.json({ message: "Matériel HS transféré vers le stock général" });
  } catch (error) {
    console.error("Erreur transferHsToGeneralStock:", error);
    res.status(500).json({ error: "Erreur lors du transfert vers stock HS" });
  }
};
