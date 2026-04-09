import { Prisma } from "@prisma/client";
import { prisma } from "../db";

type MovementType = "entree" | "sortie" | "transfert" | "ajustement" | "hs" | "creation";

type MovementInput = {
  stockId: string;
  type: MovementType;
  quantite: number;
  quantiteAvant: number;
  quantiteApres: number;
  reason?: string;
  technicienId?: string;
  performedById: string;
};

type BulkTransferInput = {
  sourceType: "warehouse" | "technician";
  sourceId?: string;
  destType: "warehouse" | "technician";
  destId?: string;
  items: Array<{
    stockId: string;
    quantite: number;
    status?: "ok" | "hs";
  }>;
  performedById: string;
};

export function createStockMovement(data: MovementInput) {
  return prisma.stockMovement.create({
    data: {
      stockId: data.stockId,
      type: data.type,
      quantite: data.quantite,
      quantiteAvant: data.quantiteAvant,
      quantiteApres: data.quantiteApres,
      reason: data.reason,
      technicienId: data.technicienId,
      performedById: data.performedById,
    },
  });
}

export async function transferStockToTechnician(input: {
  stockId: string;
  technicienId: string;
  quantite: number;
  reason?: string;
  performedById: string;
}) {
  const stock = await prisma.stock.findUnique({ where: { id: input.stockId } });
  if (!stock) {
    return { status: 404 as const, body: { error: "Article non trouvé" } };
  }

  if (stock.quantite < input.quantite) {
    return {
      status: 400 as const,
      body: { error: "Quantité insuffisante en stock" },
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedStock = await tx.stock.update({
      where: { id: input.stockId },
      data: { quantite: stock.quantite - input.quantite },
    });

    await tx.technicianStock.upsert({
      where: {
        technicienId_stockId: {
          technicienId: input.technicienId,
          stockId: input.stockId,
        },
      },
      update: {
        quantite: { increment: input.quantite },
      },
      create: {
        technicienId: input.technicienId,
        stockId: input.stockId,
        quantite: input.quantite,
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        stockId: input.stockId,
        type: "transfert",
        quantite: -input.quantite,
        quantiteAvant: stock.quantite,
        quantiteApres: stock.quantite - input.quantite,
        reason: input.reason || "Transfert vers technicien",
        technicienId: input.technicienId,
        performedById: input.performedById,
      },
    });

    return { updatedStock, movement };
  });

  return {
    status: 200 as const,
    body: {
      message: "Transfert effectué avec succès",
      stock: result.updatedStock,
      movement: result.movement,
    },
  };
}

export async function bulkImportStockItems(input: {
  items: Array<Record<string, unknown>>;
  performedById: string;
}) {
  const results = {
    created: 0,
    errors: [] as { row: number; error: string }[],
  };

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i] as Record<string, any>;
    try {
      if (!item.nomMateriel || !item.reference || !item.categorie) {
        results.errors.push({
          row: i + 1,
          error: "Champs requis manquants (nomMateriel, reference, categorie)",
        });
        continue;
      }

      const stock = await prisma.stock.create({
        data: {
          nomMateriel: item.nomMateriel,
          reference: item.reference,
          numeroSerie: item.numeroSerie || "",
          codeBarre: item.codeBarre || null,
          categorie: item.categorie,
          fournisseur: item.fournisseur || null,
          quantite: Number(item.quantite) || 1,
          lowStockThreshold: Number(item.lowStockThreshold) || 5,
          notes: item.notes || null,
        },
      });

      await prisma.stockMovement.create({
        data: {
          stockId: stock.id,
          type: "creation",
          quantite: stock.quantite,
          quantiteAvant: 0,
          quantiteApres: stock.quantite,
          reason: "Import CSV",
          performedById: input.performedById,
        },
      });

      results.created++;
    } catch (error: any) {
      results.errors.push({
        row: i + 1,
        error: error.message || "Erreur inconnue",
      });
    }
  }

  return results;
}

export async function bulkTransferStockItems(input: BulkTransferInput) {
  return prisma.$transaction(async (tx) => {
    const movements: Prisma.StockMovementCreateManyInput[] = [];

    for (const item of input.items) {
      const qty = Number(item.quantite);

      if (input.sourceType === "warehouse" && input.destType === "technician") {
        await transferWarehouseToTechnician(tx, {
          stockId: item.stockId,
          qty,
          destId: input.destId!,
          performedById: input.performedById,
          movements,
        });
        continue;
      }

      if (input.sourceType === "technician" && input.destType === "warehouse") {
        await transferTechnicianToWarehouse(tx, {
          stockId: item.stockId,
          qty,
          sourceId: input.sourceId!,
          performedById: input.performedById,
          movements,
        });
        continue;
      }

      if (input.sourceType === "technician" && input.destType === "technician") {
        await transferTechnicianToTechnician(tx, {
          stockId: item.stockId,
          qty,
          sourceId: input.sourceId!,
          destId: input.destId!,
          performedById: input.performedById,
          movements,
        });
      }
    }

    if (movements.length > 0) {
      await tx.stockMovement.createMany({ data: movements });
    }

    return movements;
  });
}

async function incrementTechnicianStock(
  tx: Prisma.TransactionClient,
  input: { technicienId: string; stockId: string; qty: number }
) {
  await tx.technicianStock.upsert({
    where: {
      technicienId_stockId: {
        technicienId: input.technicienId,
        stockId: input.stockId,
      },
    },
    update: {
      quantite: { increment: input.qty },
    },
    create: {
      technicienId: input.technicienId,
      stockId: input.stockId,
      quantite: input.qty,
    },
  });
}

async function getRequiredTechnicianStock(
  tx: Prisma.TransactionClient,
  input: { technicienId: string; stockId: string; qty: number }
) {
  const techStock = await tx.technicianStock.findUnique({
    where: {
      technicienId_stockId: {
        technicienId: input.technicienId,
        stockId: input.stockId,
      },
    },
  });

  if (!techStock || techStock.quantite < input.qty) {
    throw new Error(`Stock technicien insuffisant pour l'article ${input.stockId}`);
  }

  return techStock;
}

async function decrementTechnicianStock(
  tx: Prisma.TransactionClient,
  input: { technicienId: string; stockId: string; qty: number }
) {
  const techStock = await getRequiredTechnicianStock(tx, input);
  const newQty = techStock.quantite - input.qty;

  if (newQty <= 0) {
    await tx.technicianStock.delete({
      where: {
        technicienId_stockId: {
          technicienId: input.technicienId,
          stockId: input.stockId,
        },
      },
    });
  } else {
    await tx.technicianStock.update({
      where: {
        technicienId_stockId: {
          technicienId: input.technicienId,
          stockId: input.stockId,
        },
      },
      data: { quantite: newQty },
    });
  }

  return techStock;
}

async function transferWarehouseToTechnician(
  tx: Prisma.TransactionClient,
  input: {
    stockId: string;
    qty: number;
    destId: string;
    performedById: string;
    movements: Prisma.StockMovementCreateManyInput[];
  }
) {
  const stock = await tx.stock.findUnique({ where: { id: input.stockId } });
  if (!stock || stock.quantite < input.qty) {
    throw new Error(
      `Stock insuffisant pour l'article ${stock ? stock.nomMateriel : input.stockId}`
    );
  }

  await tx.stock.update({
    where: { id: input.stockId },
    data: { quantite: { decrement: input.qty } },
  });
  await incrementTechnicianStock(tx, {
    technicienId: input.destId,
    stockId: input.stockId,
    qty: input.qty,
  });

  input.movements.push({
    stockId: input.stockId,
    type: "transfert",
    quantite: -input.qty,
    quantiteAvant: stock.quantite,
    quantiteApres: stock.quantite - input.qty,
    reason: "Transfert Entrepôt -> Technicien",
    technicienId: input.destId,
    performedById: input.performedById,
  });
}

async function transferTechnicianToWarehouse(
  tx: Prisma.TransactionClient,
  input: {
    stockId: string;
    qty: number;
    sourceId: string;
    performedById: string;
    movements: Prisma.StockMovementCreateManyInput[];
  }
) {
  const techStock = await decrementTechnicianStock(tx, {
    technicienId: input.sourceId,
    stockId: input.stockId,
    qty: input.qty,
  });

  if ((techStock.etat || "ok") === "hs") {
    await returnHsItemToWarehouse(tx, input);
    return;
  }

  const stock = await tx.stock.update({
    where: { id: input.stockId },
    data: { quantite: { increment: input.qty } },
  });

  input.movements.push({
    stockId: input.stockId,
    type: "transfert",
    quantite: input.qty,
    quantiteAvant: stock.quantite - input.qty,
    quantiteApres: stock.quantite,
    reason: "Transfert Technicien -> Entrepôt",
    technicienId: input.sourceId,
    performedById: input.performedById,
  });
}

async function returnHsItemToWarehouse(
  tx: Prisma.TransactionClient,
  input: {
    stockId: string;
    qty: number;
    sourceId: string;
    performedById: string;
    movements: Prisma.StockMovementCreateManyInput[];
  }
) {
  const currentStock = await tx.stock.findUnique({ where: { id: input.stockId } });
  if (!currentStock) {
    throw new Error("Article original non trouvé en base");
  }

  if (currentStock.numeroSerie) {
    await tx.stock.update({
      where: { id: input.stockId },
      data: {
        quantite: { increment: input.qty },
        statut: "hs",
      },
    });

    input.movements.push({
      stockId: input.stockId,
      type: "hs",
      quantite: input.qty,
      quantiteAvant: currentStock.quantite,
      quantiteApres: currentStock.quantite + input.qty,
      reason: "Retour Technicien (HS)",
      technicienId: input.sourceId,
      performedById: input.performedById,
    });
    return;
  }

  let hsStock = await tx.stock.findFirst({
    where: {
      reference: currentStock.reference,
      statut: "hs",
      nomMateriel: currentStock.nomMateriel,
    },
  });

  if (!hsStock) {
    hsStock = await tx.stock.create({
      data: {
        nomMateriel: currentStock.nomMateriel,
        reference: currentStock.reference,
        categorie: currentStock.categorie,
        statut: "hs",
        quantite: 0,
        codeBarre: null,
        lowStockThreshold: 0,
      },
    });
  }

  await tx.stock.update({
    where: { id: hsStock.id },
    data: { quantite: { increment: input.qty } },
  });

  input.movements.push({
    stockId: hsStock.id,
    type: "hs",
    quantite: input.qty,
    quantiteAvant: hsStock.quantite,
    quantiteApres: hsStock.quantite + input.qty,
    reason: `Retour Technicien (HS) - Origine: ${input.stockId}`,
    technicienId: input.sourceId,
    performedById: input.performedById,
  });
}

async function transferTechnicianToTechnician(
  tx: Prisma.TransactionClient,
  input: {
    stockId: string;
    qty: number;
    sourceId: string;
    destId: string;
    performedById: string;
    movements: Prisma.StockMovementCreateManyInput[];
  }
) {
  await decrementTechnicianStock(tx, {
    technicienId: input.sourceId,
    stockId: input.stockId,
    qty: input.qty,
  });

  await incrementTechnicianStock(tx, {
    technicienId: input.destId,
    stockId: input.stockId,
    qty: input.qty,
  });

  const stock = await tx.stock.findUnique({ where: { id: input.stockId } });
  input.movements.push({
    stockId: input.stockId,
    type: "transfert",
    quantite: 0,
    quantiteAvant: stock?.quantite || 0,
    quantiteApres: stock?.quantite || 0,
    reason: "Transfert Technicien -> Technicien",
    technicienId: input.destId,
    performedById: input.performedById,
  });
}
