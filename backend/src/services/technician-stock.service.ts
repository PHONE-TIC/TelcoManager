import { prisma } from "../db";
import {
  findTechnicianStockItem,
  getTechnicianStockWhere,
} from "../controllers/technician-stock.controller.helpers";

export async function addTechnicianStockItem(input: {
  technicienId: string;
  stockId?: string;
  quantite?: number;
  performedById: string;
}) {
  if (!input.stockId) {
    return { status: 400 as const, body: { error: "stockId est requis" } };
  }
  const nonNullStockId = input.stockId;
  const qty = input.quantite || 1;
  if (qty <= 0) {
    return { status: 400 as const, body: { error: "La quantité doit être supérieure à 0" } };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stockExists = await tx.stock.findUnique({ where: { id: nonNullStockId } });
      if (!stockExists) {
        throw new Error("STOCK_NOT_FOUND");
      }

      const decremented = await tx.stock.updateMany({
        where: { id: nonNullStockId, quantite: { gte: qty } },
        data: { quantite: { decrement: qty } },
      });

      if (decremented.count !== 1) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const updatedStock = await tx.stock.findUniqueOrThrow({
        where: { id: nonNullStockId },
      });

      const updated = await tx.technicianStock.upsert({
        where: {
          technicienId_stockId: {
            technicienId: input.technicienId,
            stockId: nonNullStockId,
          },
        },
        update: {
          quantite: { increment: qty },
        },
        create: {
          technicienId: input.technicienId,
          stockId: nonNullStockId,
          quantite: qty,
        },
        include: {
          stock: true,
        },
      });

      await tx.stockMovement.create({
        data: {
          stockId: nonNullStockId,
          type: "transfert",
          quantite: -qty,
          quantiteAvant: updatedStock.quantite + qty,
          quantiteApres: updatedStock.quantite,
          reason: "Ajout matériel au véhicule",
          technicienId: input.technicienId,
          performedById: input.performedById,
        },
      });

      return updated;
    });

    return { status: 201 as const, body: result };
  } catch (error: any) {
    if (error.message === "STOCK_NOT_FOUND") {
      return { status: 404 as const, body: { error: "Matériel non trouvé" } };
    }
    if (error.message === "INSUFFICIENT_STOCK") {
      return { status: 400 as const, body: { error: "Quantité insuffisante en stock" } };
    }
    throw error;
  }
}

export async function updateTechnicianStockItem(input: {
  technicienId: string;
  stockId: string;
  quantite: number;
  etat?: string;
  performedById: string;
}) {
  if (!Number.isInteger(input.quantite) || input.quantite < 0) {
    return { status: 400 as const, body: { error: "Quantité invalide" } };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentTechStock = await tx.technicianStock.findUnique({
        where: {
          technicienId_stockId: {
            technicienId: input.technicienId,
            stockId: input.stockId,
          },
        },
      });

      const oldQty = currentTechStock ? currentTechStock.quantite : 0;
      const newQty = input.quantite;

      if (newQty === oldQty) {
        if (currentTechStock && input.etat) {
          const updated = await tx.technicianStock.update({
            where: {
              technicienId_stockId: {
                technicienId: input.technicienId,
                stockId: input.stockId,
              },
            },
            data: { etat: input.etat },
            include: { stock: true },
          });
          return { type: "updated" as const, data: updated };
        }
        return { type: "no_change" as const, data: { message: "Aucune modification" } };
      }

      const stockExists = await tx.stock.findUnique({ where: { id: input.stockId } });
      if (!stockExists) {
        throw new Error("STOCK_NOT_FOUND");
      }

      if (newQty > oldQty) {
        const diff = newQty - oldQty;

        const decremented = await tx.stock.updateMany({
          where: { id: input.stockId, quantite: { gte: diff } },
          data: { quantite: { decrement: diff } },
        });

        if (decremented.count !== 1) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const updatedStock = await tx.stock.findUniqueOrThrow({
          where: { id: input.stockId },
        });

        const updated = await tx.technicianStock.upsert({
          where: {
            technicienId_stockId: {
              technicienId: input.technicienId,
              stockId: input.stockId,
            },
          },
          update: {
            quantite: newQty,
            ...(input.etat && { etat: input.etat }),
          },
          create: {
            technicienId: input.technicienId,
            stockId: input.stockId,
            quantite: newQty,
            ...(input.etat && { etat: input.etat }),
          },
          include: { stock: true },
        });

        await tx.stockMovement.create({
          data: {
            stockId: input.stockId,
            type: "transfert",
            quantite: -diff,
            quantiteAvant: updatedStock.quantite + diff,
            quantiteApres: updatedStock.quantite,
            reason: "Ajustement quantité véhicule (Ajout)",
            technicienId: input.technicienId,
            performedById: input.performedById,
          },
        });

        return { type: "updated" as const, data: updated };
      } else {
        const diff = oldQty - newQty;

        const updatedStock = await tx.stock.update({
          where: { id: input.stockId },
          data: { quantite: { increment: diff } },
        });

        let updatedOrDeleted: any;
        if (newQty <= 0) {
          await tx.technicianStock.delete({
            where: {
              technicienId_stockId: {
                technicienId: input.technicienId,
                stockId: input.stockId,
              },
            },
          });
          updatedOrDeleted = { message: "Matériel retiré du véhicule" };
        } else {
          updatedOrDeleted = await tx.technicianStock.update({
            where: {
              technicienId_stockId: {
                technicienId: input.technicienId,
                stockId: input.stockId,
              },
            },
            data: {
              quantite: newQty,
              ...(input.etat && { etat: input.etat }),
            },
            include: { stock: true },
          });
        }

        await tx.stockMovement.create({
          data: {
            stockId: input.stockId,
            type: "transfert",
            quantite: diff,
            quantiteAvant: updatedStock.quantite - diff,
            quantiteApres: updatedStock.quantite,
            reason: "Ajustement quantité véhicule (Retour)",
            technicienId: input.technicienId,
            performedById: input.performedById,
          },
        });

        return { type: "updated" as const, data: updatedOrDeleted };
      }
    });

    return { status: 200 as const, body: result.data };
  } catch (error: any) {
    if (error.message === "STOCK_NOT_FOUND") {
      return { status: 404 as const, body: { error: "Matériel non trouvé" } };
    }
    if (error.message === "INSUFFICIENT_STOCK") {
      return { status: 400 as const, body: { error: "Quantité insuffisante en stock" } };
    }
    throw error;
  }
}

export async function removeTechnicianStockItem(input: {
  technicienId: string;
  stockId: string;
  performedById: string;
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.technicianStock.findUnique({
        where: getTechnicianStockWhere(input.technicienId, input.stockId),
      });

      if (!current) {
        throw new Error("VEHICLE_ITEM_NOT_FOUND");
      }

      const stock = await tx.stock.findUnique({ where: { id: input.stockId } });
      if (!stock) {
        throw new Error("STOCK_NOT_FOUND");
      }

      await tx.stock.update({
        where: { id: input.stockId },
        data: { quantite: { increment: current.quantite } },
      });

      await tx.technicianStock.delete({
        where: getTechnicianStockWhere(input.technicienId, input.stockId),
      });

      await tx.stockMovement.create({
        data: {
          stockId: input.stockId,
          type: "transfert",
          quantite: current.quantite,
          quantiteAvant: stock.quantite,
          quantiteApres: stock.quantite + current.quantite,
          reason: "Retrait matériel du véhicule (Retour complet)",
          technicienId: input.technicienId,
          performedById: input.performedById,
        },
      });

      return { message: "Matériel retiré du véhicule avec succès et retourné à l'entrepôt" };
    });

    return { status: 200 as const, body: result };
  } catch (error: any) {
    if (error.message === "VEHICLE_ITEM_NOT_FOUND") {
      return { status: 404 as const, body: { error: "Article non trouvé dans le véhicule" } };
    }
    if (error.message === "STOCK_NOT_FOUND") {
      return { status: 404 as const, body: { error: "Matériel non trouvé" } };
    }
    throw error;
  }
}

export async function assignTechnicianStockToClient(input: {
  technicienId: string;
  stockId: string;
  clientId?: string;
  performedById: string;
}) {
  if (!input.clientId) {
    return { status: 400 as const, body: { error: "clientId est requis" } };
  }

  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) {
    return { status: 404 as const, body: { error: "Client non trouvé" } };
  }

  const stock = await prisma.stock.findUnique({ where: { id: input.stockId } });
  if (!stock) {
    return { status: 404 as const, body: { error: "Matériel non trouvé" } };
  }

  if (stock.statut === "hs") {
    return {
      status: 400 as const,
      body: { error: "Impossible d'assigner : ce matériel est noté Hors Service (HS)." },
    };
  }

  const updated = await prisma.technicianStock.update({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    data: {
      clientId: input.clientId,
      assignedAt: new Date(),
    },
    include: {
      stock: true,
      client: true,
    },
  });

  await prisma.stockMovement.create({
    data: {
      stockId: input.stockId,
      type: "sortie",
      quantite: -1,
      quantiteAvant: 1,
      quantiteApres: 0,
      reason: `Assigné au client: ${client.nom}`,
      technicienId: input.technicienId,
      performedById: input.performedById,
    },
  });

  return {
    status: 200 as const,
    body: { message: "Matériel assigné au client", item: updated },
  };
}

export async function retrieveTechnicianStockFromClient(input: {
  technicienId: string;
  stockId: string;
  etat?: string;
  performedById: string;
}) {
  if (!input.etat || !["ok", "hs"].includes(input.etat)) {
    return {
      status: 400 as const,
      body: { error: "etat doit être 'ok' ou 'hs'" },
    };
  }

  const current = await prisma.technicianStock.findUnique({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    include: { client: true, stock: true },
  });

  if (!current) {
    return {
      status: 404 as const,
      body: { error: "Article non trouvé dans le stock technicien" },
    };
  }

  const clientNom = current.client?.nom || "Client inconnu";
  const updated = await prisma.technicianStock.update({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    data: {
      clientId: null,
      assignedAt: null,
      etat: input.etat,
    },
    include: {
      stock: true,
    },
  });

  await prisma.stockMovement.create({
    data: {
      stockId: input.stockId,
      type: "entree",
      quantite: 1,
      quantiteAvant: 0,
      quantiteApres: 1,
      reason: `Repris du client: ${clientNom} (état: ${input.etat.toUpperCase()})`,
      technicienId: input.technicienId,
      performedById: input.performedById,
    },
  });

  return {
    status: 200 as const,
    body: {
      message: `Matériel repris en état ${input.etat.toUpperCase()}`,
      item: updated,
    },
  };
}

export async function transferHsTechnicianStockToGeneralStock(input: {
  technicienId: string;
  stockId: string;
  performedById: string;
}) {
  const item = await prisma.technicianStock.findUnique({
    where: getTechnicianStockWhere(input.technicienId, input.stockId),
    include: { stock: true, technicien: true },
  });

  if (!item) {
    return { status: 404 as const, body: { error: "Article non trouvé" } };
  }

  if (item.etat !== "hs") {
    return {
      status: 400 as const,
      body: { error: "Seul le matériel HS peut être transféré" },
    };
  }

  const qty = item.quantite;

  await prisma.$transaction(async (tx) => {
    // Delete the vehicle stock line
    await tx.technicianStock.delete({
      where: getTechnicianStockWhere(input.technicienId, input.stockId),
    });

    if (item.stock.numeroSerie) {
      // Option A: Serialized items - update original line to HS and increment quantity
      const originalStock = await tx.stock.findUniqueOrThrow({
        where: { id: input.stockId },
      });

      await tx.stock.update({
        where: { id: input.stockId },
        data: {
          statut: "hs",
          quantite: { increment: qty },
        },
      });

      await tx.stockMovement.create({
        data: {
          stockId: input.stockId,
          type: "hs",
          quantite: qty,
          quantiteAvant: originalStock.quantite,
          quantiteApres: originalStock.quantite + qty,
          reason: `Transféré vers stock HS général depuis véhicule ${item.technicien.nom}`,
          technicienId: input.technicienId,
          performedById: input.performedById,
        },
      });
    } else {
      // Option B: Non-serialized items - find/create separate HS line in warehouse
      const originalStock = await tx.stock.findUniqueOrThrow({
        where: { id: input.stockId },
      });

      let hsStock = await tx.stock.findFirst({
        where: {
          reference: originalStock.reference,
          statut: "hs",
          nomMateriel: originalStock.nomMateriel,
        },
      });

      if (!hsStock) {
        hsStock = await tx.stock.create({
          data: {
            nomMateriel: originalStock.nomMateriel,
            reference: originalStock.reference,
            categorie: originalStock.categorie,
            statut: "hs",
            quantite: 0,
            codeBarre: null,
            lowStockThreshold: 0,
          },
        });
      }

      await tx.stock.update({
        where: { id: hsStock.id },
        data: {
          quantite: { increment: qty },
        },
      });

      await tx.stockMovement.create({
        data: {
          stockId: hsStock.id,
          type: "hs",
          quantite: qty,
          quantiteAvant: hsStock.quantite,
          quantiteApres: hsStock.quantite + qty,
          reason: `Transféré vers stock HS général depuis véhicule ${item.technicien.nom} - Origine: ${input.stockId}`,
          technicienId: input.technicienId,
          performedById: input.performedById,
        },
      });
    }
  });

  return {
    status: 200 as const,
    body: { message: "Matériel HS transféré vers le stock général" },
  };
}
